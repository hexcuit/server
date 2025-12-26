import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, desc, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { PLACEMENT_GAMES } from '@/constants/rating'
import { guildUserStats } from '@/db/schema'
import { formatRankDisplay, getRankDisplay } from '@/utils/elo'
import { GetRankingQuerySchema, GetRankingResponseSchema, GuildParamSchema } from '../schemas'

const route = createRoute({
	method: 'get',
	path: '/v1/guilds/{guildId}/rankings',
	tags: ['Guild Rankings'],
	summary: 'Get guild rankings',
	description: 'Get guild rating rankings',
	request: {
		params: GuildParamSchema,
		query: GetRankingQuerySchema,
	},
	responses: {
		200: {
			description: 'Successfully retrieved rankings',
			content: { 'application/json': { schema: GetRankingResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId } = c.req.valid('param')
	const { limit } = c.req.valid('query')
	const db = drizzle(c.env.DB)

	const rankings = await db
		.select()
		.from(guildUserStats)
		.where(and(eq(guildUserStats.guildId, guildId), eq(guildUserStats.placementGames, PLACEMENT_GAMES)))
		.orderBy(desc(guildUserStats.rating))
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

export default app
