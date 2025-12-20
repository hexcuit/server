import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { drizzle } from 'drizzle-orm/d1'
import { lolRanks, users } from '@/db/schema'
import { RankPathParamsSchema, UpsertRankBodySchema, UpsertRankResponseSchema } from './schemas'

const route = createRoute({
	method: 'put',
	path: '/v1/ranks/{discordId}',
	tags: ['LoL Ranks'],
	summary: 'Create or update LoL rank',
	description: 'Create or update LoL rank information for a Discord ID.',
	request: {
		params: RankPathParamsSchema,
		body: {
			content: {
				'application/json': {
					schema: UpsertRankBodySchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Rank upserted successfully',
			content: {
				'application/json': {
					schema: UpsertRankResponseSchema,
				},
			},
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { discordId } = c.req.valid('param')
	const { tier, division } = c.req.valid('json')
	const db = drizzle(c.env.DB)

	await db.insert(users).values({ discordId }).onConflictDoNothing()
	await db.insert(lolRanks).values({ discordId, tier, division }).onConflictDoUpdate({
		target: lolRanks.discordId,
		set: { tier, division },
	})

	return c.json({ rank: { discordId, tier, division } }, 200)
})

export default app
