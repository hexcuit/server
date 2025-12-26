import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { ranks, users } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		discordId: z.string().openapi({ description: 'Discord User ID' }),
	})
	.openapi('UpsertRankParam')

const BodySchema = createInsertSchema(ranks).pick({ tier: true, division: true }).openapi('UpsertRankBody')

const ResponseSchema = createSelectSchema(ranks)
	.pick({ tier: true, division: true })
	.extend({
		updatedAt: z.string(),
	})
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
		404: {
			description: 'User not found',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { discordId } = c.req.valid('param')
	const { tier, division } = c.req.valid('json')
	const db = drizzle(c.env.DB)

	const user = await db.select().from(users).where(eq(users.discordId, discordId)).get()

	if (!user) {
		return c.json({ message: 'User not found' }, 404)
	}

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
			updatedAt: rank.updatedAt.toISOString(),
		},
		200,
	)
})

export default app
