import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq, inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { guildRatings } from '@/db/schema'
import { formatRankDisplay, getRankDisplay, isInPlacement } from '@/utils/elo'
import { GetRatingsQuerySchema, GetRatingsResponseSchema } from './schemas'

const getRatingsRoute = createRoute({
	method: 'get',
	path: '/rating',
	tags: ['Guild Rating'],
	summary: 'ギルドレート取得',
	description: 'Discord IDのリストから対応するギルドレート情報を取得します',
	request: { query: GetRatingsQuerySchema },
	responses: {
		200: {
			description: 'レート情報の取得に成功',
			content: { 'application/json': { schema: GetRatingsResponseSchema } },
		},
	},
})

export const getRatingsRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(getRatingsRoute, async (c) => {
	const { guildId, discordIds } = c.req.valid('query')
	const db = drizzle(c.env.DB)

	const ratings = await db
		.select()
		.from(guildRatings)
		.where(and(eq(guildRatings.guildId, guildId), inArray(guildRatings.discordId, discordIds)))

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
