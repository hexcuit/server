import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

import { createDb } from '@/db'
import { ranks } from '@/db/schema'
import { ensureUser } from '@/utils/ensure'

const ParamSchema = createSelectSchema(ranks).pick({ discordId: true }).openapi('UpsertRankParam')

const BodySchema = createInsertSchema(ranks)
	.pick({ tier: true, division: true })
	.openapi('UpsertRankBody')

const ResponseSchema = createSelectSchema(ranks)
	.pick({ tier: true, division: true, updatedAt: true })
	.openapi('UpsertRankResponse')

const route = createRoute({
	method: 'put',
	path: '/v1/users/{discordId}/rank',
	tags: ['Users'],
	summary: 'Upsert rank',
	description: 'Create or update user rank',
	request: {
		params: ParamSchema,
		body: { content: { 'application/json': { schema: BodySchema } } },
	},
	responses: {
		200: {
			description: 'Rank updated',
			content: { 'application/json': { schema: ResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { discordId } = c.req.valid('param')
	const { tier, division } = c.req.valid('json')
	const db = createDb(c.env.HYPERDRIVE.connectionString)

	// Ensure user exists
	await ensureUser(db, discordId)

	const [rank] = (await db
		.insert(ranks)
		.values({ discordId, tier, division })
		.onConflictDoUpdate({
			target: ranks.discordId,
			set: { tier, division },
		})
		.returning({
			tier: ranks.tier,
			division: ranks.division,
			updatedAt: ranks.updatedAt,
		})) as [Pick<typeof ranks.$inferSelect, 'tier' | 'division' | 'updatedAt'>]

	return c.json(
		{
			tier: rank.tier,
			division: rank.division,
			updatedAt: rank.updatedAt,
		},
		200,
	)
})

export default app
