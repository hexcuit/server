import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { drizzle } from 'drizzle-orm/d1'
import { queues, users } from '@/db/schema'
import { CreateQueueBodySchema, CreateQueueResponseSchema } from './schemas'

const route = createRoute({
	method: 'post',
	path: '/v1/queues',
	tags: ['Queues'],
	summary: 'Create queue',
	description: 'Create a new queue',
	request: {
		body: {
			content: {
				'application/json': {
					schema: CreateQueueBodySchema,
				},
			},
		},
	},
	responses: {
		201: {
			description: 'Queue created successfully',
			content: {
				'application/json': {
					schema: CreateQueueResponseSchema,
				},
			},
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const data = c.req.valid('json')
	const db = drizzle(c.env.DB)

	await db.insert(users).values({ discordId: data.creatorId }).onConflictDoNothing()

	await db.insert(queues).values({
		id: data.id,
		guildId: data.guildId,
		channelId: data.channelId,
		messageId: data.messageId,
		creatorId: data.creatorId,
		type: data.type,
		anonymous: data.anonymous,
		startTime: data.startTime || null,
		status: 'open',
	})

	return c.json({ queue: { id: data.id } }, 201)
})

export default app
