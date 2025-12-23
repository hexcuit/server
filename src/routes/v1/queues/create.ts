import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { drizzle } from 'drizzle-orm/d1'
import { guilds, queues, users } from '@/db/schema'
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
	await db.insert(guilds).values({ guildId: data.guildId }).onConflictDoNothing()

	const [{ id }] = (await db
		.insert(queues)
		.values({
			guildId: data.guildId,
			channelId: data.channelId,
			messageId: data.messageId,
			creatorId: data.creatorId,
			type: data.type,
			anonymous: data.anonymous,
			capacity: data.capacity,
			startTime: data.startTime || null,
			status: 'open',
		})
		.returning({ id: queues.id })) as [{ id: string }]

	return c.json({ queue: { id } }, 201)
})

export default app
