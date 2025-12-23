import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { drizzle } from 'drizzle-orm/d1'
import { lolRanks, users } from '@/db/schema'
import { LoLRankInsertSchema, LoLRankSelectSchema } from './schemas'

const ParamsSchema = LoLRankInsertSchema.pick({ discordId: true }).openapi('UpsertRankPathParams')

const BodySchema = LoLRankInsertSchema.omit({ discordId: true, createdAt: true, updatedAt: true }).openapi(
	'UpsertRankBody',
)

const ResponseSchema = z.object({ rank: LoLRankSelectSchema }).openapi('UpsertRankResponse')

const route = createRoute({
	method: 'put',
	path: '/v1/ranks/{discordId}',
	tags: ['LoL Ranks'],
	summary: 'Create or update LoL rank',
	description: 'Create or update LoL rank information for a Discord ID.',
	request: {
		params: ParamsSchema,
		body: {
			content: {
				'application/json': {
					schema: BodySchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Rank upsert successfully',
			content: {
				'application/json': {
					schema: ResponseSchema,
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

	const normalizedDivision = division ?? null

	await db.insert(users).values({ discordId }).onConflictDoNothing()

	const [rank] = (await db
		.insert(lolRanks)
		.values({ discordId, tier, division: normalizedDivision })
		.onConflictDoUpdate({
			target: lolRanks.discordId,
			set: { tier, division: normalizedDivision },
		})
		.returning()) as [typeof lolRanks.$inferSelect]

	return c.json({ rank }, 200)
})

export default app
