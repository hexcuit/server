import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { queuePlayers, queues } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'
import { GetQueueResponseSchema, QueuePathParamsSchema } from './schemas'

const route = createRoute({
	method: 'get',
	path: '/v1/queues/{id}',
	tags: ['Queues'],
	summary: 'Get queue',
	description: 'Get queue details with participants',
	request: {
		params: QueuePathParamsSchema,
	},
	responses: {
		200: {
			description: 'Queue retrieved successfully',
			content: {
				'application/json': {
					schema: GetQueueResponseSchema,
				},
			},
		},
		404: {
			description: 'Queue not found',
			content: {
				'application/json': {
					schema: ErrorResponseSchema,
				},
			},
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { id } = c.req.valid('param')
	const db = drizzle(c.env.DB)

	const queue = await db.select().from(queues).where(eq(queues.id, id)).get()

	if (!queue) {
		return c.json({ message: 'Queue not found' }, 404)
	}

	const players = await db.select().from(queuePlayers).where(eq(queuePlayers.queueId, id))

	return c.json(
		{
			queue,
			players,
			count: players.length,
		},
		200,
	)
})

export default app
