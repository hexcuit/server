import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { lolRank, users } from '@/db/schema'
import { RankPathParamsSchema, UpsertRankBodySchema, UpsertRankResponseSchema } from './schemas'

const upsertRankRoute = createRoute({
	method: 'put',
	path: '/{discordId}',
	tags: ['LoL Ranks'],
	summary: 'Create or update LoL rank',
	description: 'Create or update LoL rank information for a Discord ID. Returns 201 for creation, 200 for update.',
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
			description: 'Rank updated successfully',
			content: {
				'application/json': {
					schema: UpsertRankResponseSchema,
				},
			},
		},
		201: {
			description: 'Rank created successfully',
			content: {
				'application/json': {
					schema: UpsertRankResponseSchema,
				},
			},
		},
	},
})

export const upsertRankRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(upsertRankRoute, async (c) => {
	const { discordId } = c.req.valid('param')
	const { tier, division } = c.req.valid('json')

	const db = drizzle(c.env.DB)

	// Check for existing record
	const existing = await db.select().from(lolRank).where(eq(lolRank.discordId, discordId)).get()

	await db
		.insert(users)
		.values({
			discordId,
		})
		.onConflictDoNothing()

	await db.insert(lolRank).values({ discordId, tier, division }).onConflictDoUpdate({
		target: lolRank.discordId,
		set: { tier, division },
	})

	const rank = { discordId, tier, division }

	if (existing) {
		return c.json({ rank }, 200)
	}
	return c.json({ rank }, 201)
})
