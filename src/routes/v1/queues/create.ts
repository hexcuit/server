import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { drizzle } from 'drizzle-orm/d1'
import { HTTPException } from 'hono/http-exception'
import { queues, users } from '@/db/schema'
import { CreateQueueBodySchema, CreateQueueResponseSchema } from './schemas'

const createQueueRoute = createRoute({
	method: 'post',
	path: '/',
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
		409: {
			description: 'Queue with the specified ID already exists',
		},
	},
})

export const createQueueRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(
	createQueueRoute,
	async (c) => {
		const data = c.req.valid('json')
		const db = drizzle(c.env.DB)

		await db.insert(users).values({ discordId: data.creatorId }).onConflictDoNothing()

		try {
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
		} catch (error) {
			if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
				throw new HTTPException(409, { message: 'Queue with the specified ID already exists' })
			}
			throw error
		}

		return c.json({ queue: { id: data.id } }, 201)
	},
)
