import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { guildQueues } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'
import { QueuePathParamsSchema } from './schemas'

const ResponseSchema = z
	.object({
		removed: z.boolean(),
	})
	.openapi('RemoveQueueResponse')

const route = createRoute({
	method: 'delete',
	path: '/v1/guilds/{guildId}/queues/{id}',
	tags: ['Guild Queues'],
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
					schema: ResponseSchema,
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
	const { guildId, id } = c.req.valid('param')
	const db = drizzle(c.env.DB)

	const result = await db
		.delete(guildQueues)
		.where(and(eq(guildQueues.id, id), eq(guildQueues.guildId, guildId)))
		.run()

	if (result.meta.changes === 0) {
		return c.json({ message: 'Queue not found' }, 404)
	}

	return c.json({ removed: true }, 200)
})

export default app
