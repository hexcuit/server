import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { lolRank } from '@/db/schema'
import { GetRanksQuerySchema, GetRanksResponseSchema } from './schemas'

const getRanksRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['LoL Rank'],
	summary: 'LoLランク情報を取得',
	description: 'Discord IDのリストから対応するLoLランク情報を取得します',
	request: {
		query: GetRanksQuerySchema,
	},
	responses: {
		200: {
			description: 'ランク情報の取得に成功',
			content: {
				'application/json': {
					schema: GetRanksResponseSchema,
				},
			},
		},
	},
})

export const getRanksRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(getRanksRoute, async (c) => {
	const { discordIds } = c.req.valid('query')

	const db = drizzle(c.env.DB)

	const ranks = await db.select().from(lolRank).where(inArray(lolRank.discordId, discordIds))

	const ranksMap = new Map(ranks.map((rank) => [rank.discordId, rank]))

	const result = discordIds.map((discordId) => {
		const rank = ranksMap.get(discordId)
		return (
			rank || {
				discordId,
				tier: 'UNRANKED',
				division: '',
			}
		)
	})

	return c.json({ ranks: result })
})
