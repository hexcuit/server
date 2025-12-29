import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import { guildQueues, guilds } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
	})
	.openapi('CreateQueueParam')

const BodySchema = createInsertSchema(guildQueues)
	.pick({ channelId: true, messageId: true, creatorId: true, type: true, anonymous: true, capacity: true })
	.openapi('CreateQueueBody')

const ResponseSchema = createSelectSchema(guildQueues)
	.pick({ id: true, status: true, createdAt: true })
	.openapi('CreateQueueResponse')

const route = createRoute({
	method: 'post',
	path: '/v1/guilds/{guildId}/queues',
	tags: ['Queues'],
	summary: 'Create queue',
	description: 'Create a new queue',
	request: {
		params: ParamSchema,
		body: { content: { 'application/json': { schema: BodySchema } } },
	},
	responses: {
		201: {
			description: 'Queue created',
			content: { 'application/json': { schema: ResponseSchema } },
		},
		404: {
			description: 'Guild not found',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
		409: {
			description: 'Queue with this messageId already exists',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId } = c.req.valid('param')
	const body = c.req.valid('json')
	const db = drizzle(c.env.DB)

	// Check if guild exists
	const guild = await db.select().from(guilds).where(eq(guilds.guildId, guildId)).get()

	if (!guild) {
		return c.json({ message: 'Guild not found' }, 404)
	}

	// Create queue
	const [queue] = await db
		.insert(guildQueues)
		.values({
			guildId,
			...body,
			status: 'open',
		})
		.onConflictDoNothing()
		.returning({
			id: guildQueues.id,
			status: guildQueues.status,
			createdAt: guildQueues.createdAt,
		})

	if (!queue) {
		return c.json({ message: 'Queue with this messageId already exists' }, 409)
	}

	return c.json(queue, 201)
})

export default app
