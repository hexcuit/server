import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { drizzle } from 'drizzle-orm/d1'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { ranks, users } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const BodySchema = createInsertSchema(users).pick({ discordId: true }).openapi('CreateUserBody')

const RankSchema = createSelectSchema(ranks).pick({ tier: true, division: true })

const ResponseSchema = createSelectSchema(users)
	.pick({ discordId: true, createdAt: true })
	.extend({
		rank: RankSchema.nullable(),
	})
	.openapi('CreateUserResponse')

const route = createRoute({
	method: 'post',
	path: '/v1/users',
	tags: ['Users'],
	summary: 'Create user',
	description: 'Create a new user',
	request: {
		body: { content: { 'application/json': { schema: BodySchema } } },
	},
	responses: {
		201: {
			description: 'User created',
			content: { 'application/json': { schema: ResponseSchema } },
		},
		409: {
			description: 'User already exists',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { discordId } = c.req.valid('json')
	const db = drizzle(c.env.DB)

	const [user] = await db.insert(users).values({ discordId }).onConflictDoNothing().returning({
		discordId: users.discordId,
		createdAt: users.createdAt,
	})

	if (!user) {
		return c.json({ message: 'User already exists' }, 409)
	}

	return c.json(
		{
			discordId: user.discordId,
			createdAt: user.createdAt,
			rank: null,
		},
		201,
	)
})

export default app
