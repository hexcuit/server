import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { createSelectSchema } from 'drizzle-zod'
import { ranks, users } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		discordId: z.string().openapi({ description: 'Discord User ID' }),
	})
	.openapi('GetUserParam')

const RankSchema = createSelectSchema(ranks).pick({ tier: true, division: true })

const ResponseSchema = createSelectSchema(users)
	.pick({ discordId: true })
	.extend({
		createdAt: z.string(),
		rank: RankSchema.nullable(),
	})
	.openapi('GetUserResponse')

const route = createRoute({
	method: 'get',
	path: '/v1/users/{discordId}',
	tags: ['Users'],
	summary: 'Get user',
	description: 'Get user by Discord ID',
	request: {
		params: ParamSchema,
	},
	responses: {
		200: {
			description: 'User found',
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
	const db = drizzle(c.env.DB)

	const user = await db.select().from(users).where(eq(users.discordId, discordId)).get()

	if (!user) {
		return c.json({ message: 'User not found' }, 404)
	}

	const rank = await db.select().from(ranks).where(eq(ranks.discordId, discordId)).get()

	return c.json(
		{
			discordId: user.discordId,
			createdAt: user.createdAt.toISOString(),
			rank: rank
				? {
						tier: rank.tier,
						division: rank.division,
					}
				: null,
		},
		200,
	)
})

export default app
