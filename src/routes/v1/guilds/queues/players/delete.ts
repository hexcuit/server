import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { z } from 'zod'
import { guildQueuePlayers, guildQueues, guilds } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
		queueId: z.string().openapi({ description: 'Queue ID' }),
		discordId: z.string().openapi({ description: 'Discord User ID' }),
	})
	.openapi('DeleteQueuePlayerParam')

const route = createRoute({
	method: 'delete',
	path: '/v1/guilds/{guildId}/queues/{queueId}/players/{discordId}',
	tags: ['QueuePlayers'],
	summary: 'Leave queue',
	description: 'Remove player from queue',
	request: {
		params: ParamSchema,
	},
	responses: {
		204: {
			description: 'Player removed from queue',
		},
		404: {
			description: 'Guild, queue, or player not found',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId, queueId, discordId } = c.req.valid('param')
	const db = drizzle(c.env.DB)

	// Check if guild exists
	const guild = await db.select().from(guilds).where(eq(guilds.guildId, guildId)).get()

	if (!guild) {
		return c.json({ message: 'Guild not found' }, 404)
	}

	// Check if queue exists
	const queue = await db
		.select()
		.from(guildQueues)
		.where(and(eq(guildQueues.id, queueId), eq(guildQueues.guildId, guildId)))
		.get()

	if (!queue) {
		return c.json({ message: 'Queue not found' }, 404)
	}

	// Delete player
	const result = await db
		.delete(guildQueuePlayers)
		.where(and(eq(guildQueuePlayers.queueId, queueId), eq(guildQueuePlayers.discordId, discordId)))
		.returning({ discordId: guildQueuePlayers.discordId })

	if (result.length === 0) {
		return c.json({ message: 'Player not found in queue' }, 404)
	}

	return c.body(null, 204)
})

export default app
