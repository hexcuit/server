import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { queuePlayers, queues } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'
import { QueuePathParamsSchema, QueuePlayerSelectSchema, QueueSelectSchema } from './schemas'

const ResponseSchema = z
	.object({
		queue: QueueSelectSchema,
		players: z.array(QueuePlayerSelectSchema),
		count: z.number(),
	})
	.openapi('GetQueueResponse')

const route = createRoute({
	method: 'get',
	path: '/v1/guilds/{guildId}/queues/{id}',
	tags: ['Guild Queues'],
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

	const queue = await db
		.select()
		.from(queues)
		.where(and(eq(queues.id, id), eq(queues.guildId, guildId)))
		.get()

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
