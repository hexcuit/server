import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { guildQueuePlayers, guildQueues } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'
import { LeaveResponseSchema, PlayerPathParamsSchema } from './schemas'

const route = createRoute({
	method: 'delete',
	path: '/v1/guilds/{guildId}/queues/{id}/players/{discordId}',
	tags: ['Guild Queues'],
	summary: 'Leave queue',
	description: 'Leave a queue',
	request: {
		params: PlayerPathParamsSchema,
	},
	responses: {
		200: {
			description: 'Successfully left queue',
			content: {
				'application/json': {
					schema: LeaveResponseSchema,
				},
			},
		},
		404: {
			description: 'Player not found',
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
	const { guildId, id, discordId } = c.req.valid('param')
	const db = drizzle(c.env.DB)

	// Verify queue belongs to guild
	const queue = await db
		.select()
		.from(guildQueues)
		.where(and(eq(guildQueues.id, id), eq(guildQueues.guildId, guildId)))
		.get()

	if (!queue) {
		return c.json({ message: 'Queue not found' }, 404)
	}

	const existing = await db
		.select()
		.from(guildQueuePlayers)
		.where(and(eq(guildQueuePlayers.queueId, id), eq(guildQueuePlayers.discordId, discordId)))
		.get()

	if (!existing) {
		return c.json({ message: 'Player not found' }, 404)
	}

	await db
		.delete(guildQueuePlayers)
		.where(and(eq(guildQueuePlayers.queueId, id), eq(guildQueuePlayers.discordId, discordId)))

	if (queue.status === 'full') {
		await db.update(guildQueues).set({ status: 'open' }).where(eq(guildQueues.id, id))
	}

	const players = await db.select().from(guildQueuePlayers).where(eq(guildQueuePlayers.queueId, id))

	return c.json({ count: players.length }, 200)
})

export default app
