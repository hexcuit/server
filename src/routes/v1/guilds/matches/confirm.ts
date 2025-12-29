import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { z } from 'zod'
import type { MatchResult, PlayerResult } from '@/constants'
import { K_FACTOR_NORMAL, K_FACTOR_PLACEMENT, PLACEMENT_GAMES } from '@/constants/rating'
import {
	guildMatches,
	guildMatchPlayers,
	guildSettings,
	guilds,
	guildUserMatchHistory,
	guildUserStats,
} from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
		matchId: z.string().openapi({ description: 'Match ID' }),
	})
	.openapi('ConfirmMatchParam')

const RatingChangeSchema = z.object({
	discordId: z.string(),
	ratingBefore: z.number(),
	ratingAfter: z.number(),
	ratingChange: z.number(),
})

const ResponseSchema = z
	.object({
		confirmed: z.boolean(),
		winningTeam: z.enum(['BLUE', 'RED', 'DRAW']).nullable(),
		ratingChanges: z.array(RatingChangeSchema),
	})
	.openapi('ConfirmMatchResponse')

const route = createRoute({
	method: 'post',
	path: '/v1/guilds/{guildId}/matches/{matchId}/confirm',
	tags: ['Matches'],
	summary: 'Confirm match',
	description: 'Confirm match result and calculate rating changes',
	request: {
		params: ParamSchema,
	},
	responses: {
		200: {
			description: 'Match confirmed',
			content: { 'application/json': { schema: ResponseSchema } },
		},
		404: {
			description: 'Guild or match not found',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
		400: {
			description: 'Match already confirmed or no majority vote',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId, matchId } = c.req.valid('param')
	const db = drizzle(c.env.DB)

	// Check if guild exists
	const guild = await db.select().from(guilds).where(eq(guilds.guildId, guildId)).get()

	if (!guild) {
		return c.json({ message: 'Guild not found' }, 404)
	}

	// Get match
	const match = await db
		.select()
		.from(guildMatches)
		.where(and(eq(guildMatches.id, matchId), eq(guildMatches.guildId, guildId)))
		.get()

	if (!match) {
		return c.json({ message: 'Match not found' }, 404)
	}

	if (match.status === 'confirmed') {
		return c.json({ message: 'Match already confirmed' }, 400)
	}

	// Determine winner
	const { blueVotes, redVotes, drawVotes } = match
	let winningTeam: MatchResult | null = null

	if (blueVotes > redVotes && blueVotes > drawVotes) {
		winningTeam = 'BLUE'
	} else if (redVotes > blueVotes && redVotes > drawVotes) {
		winningTeam = 'RED'
	} else if (drawVotes > blueVotes && drawVotes > redVotes) {
		winningTeam = 'DRAW'
	} else {
		return c.json({ message: 'No majority vote' }, 400)
	}

	// Get guild settings for kFactor
	const settings = await db.select().from(guildSettings).where(eq(guildSettings.guildId, guildId)).get()
	const kFactorNormal = settings?.kFactor ?? K_FACTOR_NORMAL
	const placementGamesRequired = settings?.placementGamesRequired ?? PLACEMENT_GAMES

	// Get players and their current stats
	const players = await db.select().from(guildMatchPlayers).where(eq(guildMatchPlayers.matchId, matchId))

	const playerStats = await db.select().from(guildUserStats).where(eq(guildUserStats.guildId, guildId))

	const statsMap = new Map(playerStats.map((s) => [s.discordId, s]))

	// Calculate rating changes
	const ratingChanges: { discordId: string; ratingBefore: number; ratingAfter: number; ratingChange: number }[] = []
	const statsUpdates: {
		discordId: string
		rating: number
		wins: number
		losses: number
		placementGames: number
		currentStreak: number
		peakRating: number
		lastPlayedAt: Date
	}[] = []
	const historyInserts: (typeof guildUserMatchHistory.$inferInsert)[] = []

	const now = new Date()

	for (const player of players) {
		const currentStats = statsMap.get(player.discordId)
		if (!currentStats) continue

		// Use higher K factor during placement games
		const isPlacement = currentStats.placementGames < placementGamesRequired
		const kFactor = isPlacement ? K_FACTOR_PLACEMENT : kFactorNormal

		let result: PlayerResult
		let ratingChange: number

		if (winningTeam === 'DRAW') {
			result = 'DRAW'
			ratingChange = 0
		} else if (player.team === winningTeam) {
			result = 'WIN'
			ratingChange = Math.round(kFactor / 2)
		} else {
			result = 'LOSE'
			ratingChange = -Math.round(kFactor / 2)
		}

		const ratingAfter = player.ratingBefore + ratingChange
		const newWins = result === 'WIN' ? currentStats.wins + 1 : currentStats.wins
		const newLosses = result === 'LOSE' ? currentStats.losses + 1 : currentStats.losses
		const newPlacementGames = isPlacement ? currentStats.placementGames + 1 : currentStats.placementGames
		const newStreak =
			result === 'WIN'
				? currentStats.currentStreak > 0
					? currentStats.currentStreak + 1
					: 1
				: result === 'LOSE'
					? currentStats.currentStreak < 0
						? currentStats.currentStreak - 1
						: -1
					: 0
		const newPeakRating = Math.max(currentStats.peakRating, ratingAfter)

		// Collect updates for batch
		statsUpdates.push({
			discordId: player.discordId,
			rating: ratingAfter,
			wins: newWins,
			losses: newLosses,
			placementGames: newPlacementGames,
			currentStreak: newStreak,
			peakRating: newPeakRating,
			lastPlayedAt: now,
		})

		historyInserts.push({
			guildId,
			discordId: player.discordId,
			matchId,
			result,
			ratingChange,
			ratingAfter,
		})

		ratingChanges.push({
			discordId: player.discordId,
			ratingBefore: player.ratingBefore,
			ratingAfter,
			ratingChange,
		})
	}

	// Execute all updates in a batch (atomic operation in D1)
	await db.batch([
		// Update match status
		db
			.update(guildMatches)
			.set({
				status: 'confirmed',
				winningTeam,
				confirmedAt: now,
			})
			.where(eq(guildMatches.id, matchId)),
		// Update all player stats
		...statsUpdates.map((update) =>
			db
				.update(guildUserStats)
				.set({
					rating: update.rating,
					wins: update.wins,
					losses: update.losses,
					placementGames: update.placementGames,
					currentStreak: update.currentStreak,
					peakRating: update.peakRating,
					lastPlayedAt: update.lastPlayedAt,
				})
				.where(and(eq(guildUserStats.guildId, guildId), eq(guildUserStats.discordId, update.discordId as string))),
		),
		// Insert all history records
		...(historyInserts.length > 0 ? [db.insert(guildUserMatchHistory).values(historyInserts)] : []),
	])

	return c.json(
		{
			confirmed: true,
			winningTeam,
			ratingChanges,
		},
		200,
	)
})

export default app
