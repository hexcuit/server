import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, desc, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { guildRatings } from '@/db/schema'
import { formatRankDisplay, getRankDisplay, PLACEMENT_GAMES } from '@/utils/elo'
import { GetRankingQuerySchema, GetRankingResponseSchema } from './schemas'

const getRankingRoute = createRoute({
	method: 'get',
	path: '/ranking',
	tags: ['Guild Rating'],
	summary: 'ランキング取得',
	description: 'ギルドのレートランキングを取得します',
	request: { query: GetRankingQuerySchema },
	responses: {
		200: {
			description: 'ランキング取得成功',
			content: { 'application/json': { schema: GetRankingResponseSchema } },
		},
	},
})

export const getRankingRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(getRankingRoute, async (c) => {
	const { guildId, limit } = c.req.valid('query')
	const db = drizzle(c.env.DB)

	const rankings = await db
		.select()
		.from(guildRatings)
		.where(and(eq(guildRatings.guildId, guildId), eq(guildRatings.placementGames, PLACEMENT_GAMES)))
		.orderBy(desc(guildRatings.rating))
		.limit(limit)

	const result = rankings.map((r, index) => {
		const rankDisplay = getRankDisplay(r.rating)
		return {
			position: index + 1,
			discordId: r.discordId,
			rating: r.rating,
			wins: r.wins,
			losses: r.losses,
			winRate: r.wins + r.losses > 0 ? Math.round((r.wins / (r.wins + r.losses)) * 100) : 0,
			rank: formatRankDisplay(rankDisplay),
			rankDetail: rankDisplay,
		}
	})

	return c.json({ guildId, rankings: result })
})
