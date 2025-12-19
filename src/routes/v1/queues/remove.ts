import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { hc } from 'hono/client'
import { queues } from '@/db/schema'
import { QueuePathParamsSchema, RemoveQueueResponseSchema } from './schemas'

const route = createRoute({
	method: 'delete',
	path: '/v1/queues/{id}',
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
					schema: RemoveQueueResponseSchema,
				},
			},
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { id } = c.req.valid('param')
	const db = drizzle(c.env.DB)

	await db.delete(queues).where(eq(queues.id, id))

	return c.json({ removed: true })
})

export default app

export const hcWithType = (...args: Parameters<typeof hc>) => hc<typeof typedApp>(...args)
