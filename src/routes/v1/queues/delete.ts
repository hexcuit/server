import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { queues } from '@/db/schema'
import { DeleteQueueResponseSchema, QueuePathParamsSchema } from './schemas'

const deleteQueueRoute = createRoute({
	method: 'delete',
	path: '/{id}',
	tags: ['Queues'],
	summary: 'Delete queue',
	description: 'Delete a queue and all its participants (cascade)',
	request: {
		params: QueuePathParamsSchema,
	},
	responses: {
		200: {
			description: 'Queue deleted successfully',
			content: {
				'application/json': {
					schema: DeleteQueueResponseSchema,
				},
			},
		},
	},
})

export const deleteQueueRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(
	deleteQueueRoute,
	async (c) => {
		const { id } = c.req.valid('param')
		const db = drizzle(c.env.DB)

		await db.delete(queues).where(eq(queues.id, id))

		return c.json({ deleted: true })
	},
)
