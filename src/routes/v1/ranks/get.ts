import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { hc } from 'hono/client'
import { lolRanks } from '@/db/schema'
import { GetRanksQuerySchema, GetRanksResponseSchema } from './schemas'

const route = createRoute({
	method: 'get',
	path: '/v1/ranks',
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

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { id } = c.req.valid('query')

	const db = drizzle(c.env.DB)

	const ranks = await db.select().from(lolRanks).where(inArray(lolRanks.discordId, id))

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

export default app

export const hcWithType = (...args: Parameters<typeof hc>) => hc<typeof typedApp>(...args)
