import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq, inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { guildUserStats } from '@/db/schema'
import { formatRankDisplay, getRankDisplay, isInPlacement } from '@/utils/elo'
import { GetRatingsQuerySchema, GetRatingsResponseSchema, GuildParamSchema } from '../schemas'

const route = createRoute({
	method: 'get',
	path: '/v1/guilds/{guildId}/ratings',
	tags: ['Guild Ratings'],
	summary: 'Get guild ratings',
	description: 'Get guild rating information for a list of Discord IDs',
	request: {
		params: GuildParamSchema,
		query: GetRatingsQuerySchema,
	},
	responses: {
		200: {
			description: 'Successfully retrieved ratings',
			content: { 'application/json': { schema: GetRatingsResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId } = c.req.valid('param')
	const { id: discordIds } = c.req.valid('query')
	const db = drizzle(c.env.DB)

	const ratings = await db
		.select()
		.from(guildUserStats)
		.where(and(eq(guildUserStats.guildId, guildId), inArray(guildUserStats.discordId, discordIds)))

	const ratingsMap = new Map(ratings.map((r) => [r.discordId, r]))

	const result = discordIds.map((discordId) => {
		const rating = ratingsMap.get(discordId)
		if (rating) {
			const rankDisplay = getRankDisplay(rating.rating)
			return {
				discordId,
				guildId,
				rating: rating.rating,
				wins: rating.wins,
				losses: rating.losses,
				placementGames: rating.placementGames,
				isPlacement: isInPlacement(rating.placementGames),
				rank: formatRankDisplay(rankDisplay),
				rankDetail: rankDisplay,
			}
		}
		return {
			discordId,
			guildId,
			rating: null,
			wins: null,
			losses: null,
			placementGames: null,
			isPlacement: null,
			rank: null,
			rankDetail: null,
		}
	})

	return c.json({ ratings: result })
})

export default app
