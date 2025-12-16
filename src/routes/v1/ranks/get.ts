import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { lolRank } from '@/db/schema'
import { GetRanksQuerySchema, GetRanksResponseSchema } from './schemas'

const getRanksRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['LoL Ranks'],
	summary: 'Get LoL ranks',
	description: 'Get LoL rank information for a list of Discord IDs',
	request: {
		query: GetRanksQuerySchema,
	},
	responses: {
		200: {
			description: 'Successfully retrieved rank information',
			content: {
				'application/json': {
					schema: GetRanksResponseSchema,
				},
			},
		},
	},
})

export const getRanksRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(getRanksRoute, async (c) => {
	const { id } = c.req.valid('query')

	const db = drizzle(c.env.DB)

	const ranks = await db.select().from(lolRank).where(inArray(lolRank.discordId, id))

	const ranksMap = new Map(ranks.map((rank) => [rank.discordId, rank]))

	const result = id.map((discordId) => {
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
