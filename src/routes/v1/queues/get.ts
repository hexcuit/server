import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { HTTPException } from 'hono/http-exception'
import { queuePlayers, queues } from '@/db/schema'
import { GetQueueResponseSchema, QueuePathParamsSchema } from './schemas'

const getQueueRoute = createRoute({
	method: 'get',
	path: '/{id}',
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
	},
})

export const getQueueRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(getQueueRoute, async (c) => {
	const { id } = c.req.valid('param')
	const db = drizzle(c.env.DB)

	const queue = await db.select().from(queues).where(eq(queues.id, id)).get()

	if (!queue) {
		throw new HTTPException(404, { message: 'Queue not found' })
	}

	const players = await db.select().from(queuePlayers).where(eq(queuePlayers.queueId, id))

	return c.json({
		queue,
		players,
		count: players.length,
	})
})
