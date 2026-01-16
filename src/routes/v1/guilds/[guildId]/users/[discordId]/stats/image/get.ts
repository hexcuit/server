import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, count, desc, eq, gt } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

import type { MatchHistoryItem, RatingHistoryPoint } from '@/utils/stats-card'

import { createDb } from '@/db'
import { guildSettings, guilds, guildUserMatchHistory, guildUserStats, ranks } from '@/db/schema'
import { getRankDisplay } from '@/utils/elo'
import { ErrorResponseSchema } from '@/utils/schemas'
import { generateStatsCard } from '@/utils/stats-card'

const ParamSchema = createSelectSchema(guildUserStats)
	.pick({ guildId: true, discordId: true })
	.openapi('GetStatsImageParam')

const QuerySchema = z
	.object({
		displayName: z
			.string()
			.optional()
			.openapi({ description: 'Display name (defaults to discordId)' }),
		avatarUrl: z.url().optional().openapi({ description: 'Avatar URL' }),
	})
	.openapi('GetStatsImageQuery')

const route = createRoute({
	method: 'get',
	path: '/v1/guilds/{guildId}/users/{discordId}/stats/image',
	tags: ['Stats'],
	summary: 'Get user stats card image',
	description: 'Generate a PNG stats card for a user in a guild',
	request: {
		params: ParamSchema,
		query: QuerySchema,
	},
	responses: {
		200: {
			description: 'Stats card image (PNG)',
			content: { 'image/png': { schema: { type: 'string', format: 'binary' } } },
		},
		404: {
			description: 'Guild or stats not found',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

// Default avatar
const DEFAULT_AVATAR = 'https://cdn.discordapp.com/embed/avatars/0.png'

// Convert image to Base64 Data URL (satori cannot directly process external URLs)
async function fetchImageAsDataUrl(url: string): Promise<string> {
	try {
		const response = await fetch(url)
		if (!response.ok) {
			throw new Error(`Failed to fetch image: ${response.status}`)
		}
		const buffer = await response.arrayBuffer()
		const bytes = new Uint8Array(buffer)
		let binary = ''
		for (let i = 0; i < bytes.length; i++) {
			binary += String.fromCharCode(bytes[i] as number)
		}
		const base64 = btoa(binary)
		const contentType = response.headers.get('content-type') ?? 'image/png'
		return `data:${contentType};base64,${base64}`
	} catch {
		// Fallback: 1x1 transparent PNG
		return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
	}
}

// Generate rank display string
function formatRankDisplay(rating: number): string {
	const { tier, division } = getRankDisplay(rating)
	return division ? `${tier} ${division}` : tier
}

export const typedApp = app.openapi(route, async (c) => {
	const { guildId, discordId } = c.req.valid('param')
	const { displayName, avatarUrl } = c.req.valid('query')
	const db = createDb(c.env.HYPERDRIVE.connectionString)

	// Check if guild exists
	const [guild] = await db.select().from(guilds).where(eq(guilds.guildId, guildId))

	if (!guild) {
		return c.json({ message: 'Guild not found' }, 404)
	}

	// Get stats
	const [stats] = await db
		.select()
		.from(guildUserStats)
		.where(and(eq(guildUserStats.guildId, guildId), eq(guildUserStats.discordId, discordId)))

	if (!stats) {
		return c.json({ message: 'Stats not found' }, 404)
	}

	// Get guild settings for placement games
	const [settings] = await db.select().from(guildSettings).where(eq(guildSettings.guildId, guildId))

	const placementGamesRequired = settings?.placementGamesRequired ?? 5

	// Get ranking position
	const [positionResult] = await db
		.select({ count: count() })
		.from(guildUserStats)
		.where(and(eq(guildUserStats.guildId, guildId), gt(guildUserStats.rating, stats.rating)))

	const position = (positionResult?.count ?? 0) + 1

	// Get total players count
	const [totalResult] = await db
		.select({ count: count() })
		.from(guildUserStats)
		.where(eq(guildUserStats.guildId, guildId))

	const totalPlayers = totalResult?.count ?? 0

	// Get match history (last 10 matches)
	const historyRecords = await db
		.select({
			result: guildUserMatchHistory.result,
			ratingChange: guildUserMatchHistory.ratingChange,
			ratingAfter: guildUserMatchHistory.ratingAfter,
			createdAt: guildUserMatchHistory.createdAt,
		})
		.from(guildUserMatchHistory)
		.where(
			and(
				eq(guildUserMatchHistory.guildId, guildId),
				eq(guildUserMatchHistory.discordId, discordId),
			),
		)
		.orderBy(desc(guildUserMatchHistory.createdAt))
		.limit(10)

	// Convert to MatchHistoryItem format
	const matchHistory: MatchHistoryItem[] = historyRecords.map((h) => ({
		won: h.result === 'WIN',
		change: h.ratingChange,
	}))

	// Convert to RatingHistoryPoint format (for graph)
	const ratingHistory: RatingHistoryPoint[] = historyRecords
		.slice()
		.reverse()
		.map((h) => ({
			date: new Date(h.createdAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
			rating: h.ratingAfter,
		}))

	// Add current rating as the latest point if not already there
	if (
		ratingHistory.length === 0 ||
		ratingHistory[ratingHistory.length - 1]?.rating !== stats.rating
	) {
		ratingHistory.push({
			date: new Date().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
			rating: stats.rating,
		})
	}

	// Calculate win rate
	const totalGames = stats.wins + stats.losses
	const winRate = totalGames > 0 ? Math.round((stats.wins / totalGames) * 100) : 0

	// Check if in placement
	const isPlacement = stats.placementGames < placementGamesRequired

	// Try to get LoL rank from ranks table
	const [userRank] = await db
		.select({ tier: ranks.tier, division: ranks.division })
		.from(ranks)
		.where(eq(ranks.discordId, discordId))

	const rankString = userRank
		? userRank.division
			? `${userRank.tier} ${userRank.division}`
			: userRank.tier
		: formatRankDisplay(stats.rating)

	// Convert avatar image to Base64 (satori cannot directly process external URLs)
	const avatarDataUrl = await fetchImageAsDataUrl(avatarUrl ?? DEFAULT_AVATAR)

	// Generate stats card
	const png = await generateStatsCard({
		displayName: displayName ?? discordId,
		avatarUrl: avatarDataUrl,
		rank: rankString,
		rating: stats.rating,
		wins: stats.wins,
		losses: stats.losses,
		winRate,
		position,
		totalPlayers,
		isPlacement,
		placementGames: stats.placementGames,
		matchHistory,
		ratingHistory,
	})

	return new Response(png, {
		status: 200,
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': 'public, max-age=60',
		},
	})
})

export default app
