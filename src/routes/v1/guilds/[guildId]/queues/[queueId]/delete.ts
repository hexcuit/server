import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { z } from 'zod'
import { guildQueues, guilds } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
		queueId: z.string().openapi({ description: 'Queue ID' }),
	})
	.openapi('DeleteQueueParam')

const route = createRoute({
	method: 'delete',
	path: '/v1/guilds/{guildId}/queues/{queueId}',
	tags: ['Queues'],
	summary: 'Delete queue',
	description: '募集をキャンセルする',
	request: {
		params: ParamSchema,
	},
	responses: {
		204: {
			description: 'Queue deleted',
		},
		404: {
			description: 'Guild or queue not found',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId, queueId } = c.req.valid('param')
	const db = drizzle(c.env.DB)

	// Check if guild exists
	const guild = await db.select().from(guilds).where(eq(guilds.guildId, guildId)).get()

	if (!guild) {
		return c.json({ message: 'Guild not found' }, 404)
	}

	// Delete queue
	const result = await db
		.delete(guildQueues)
		.where(and(eq(guildQueues.id, queueId), eq(guildQueues.guildId, guildId)))
		.returning({ id: guildQueues.id })

	if (result.length === 0) {
		return c.json({ message: 'Queue not found' }, 404)
	}

	return c.body(null, 204)
})

export default app
