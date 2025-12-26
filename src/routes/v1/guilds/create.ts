import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { drizzle } from 'drizzle-orm/d1'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { guilds } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const BodySchema = createInsertSchema(guilds).pick({ guildId: true }).openapi('CreateGuildBody')

const ResponseSchema = createSelectSchema(guilds)
	.pick({ guildId: true, plan: true, createdAt: true })
	.openapi('CreateGuildResponse')

const route = createRoute({
	method: 'post',
	path: '/v1/guilds',
	tags: ['Guilds'],
	summary: 'Create guild',
	description: 'Create a new guild',
	request: {
		body: { content: { 'application/json': { schema: BodySchema } } },
	},
	responses: {
		201: {
			description: 'Guild created',
			content: { 'application/json': { schema: ResponseSchema } },
		},
		409: {
			description: 'Guild already exists',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId } = c.req.valid('json')
	const db = drizzle(c.env.DB)

	const [guild] = await db.insert(guilds).values({ guildId }).onConflictDoNothing().returning({
		guildId: guilds.guildId,
		plan: guilds.plan,
		createdAt: guilds.createdAt,
	})

	if (!guild) {
		return c.json({ message: 'Guild already exists' }, 409)
	}

	return c.json(
		{
			guildId: guild.guildId,
			plan: guild.plan,
			createdAt: guild.createdAt,
		},
		201,
	)
})

export default app
