import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { queuePlayers, queues } from '@/db/schema'
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
		.from(queues)
		.where(and(eq(queues.id, id), eq(queues.guildId, guildId)))
		.get()

	if (!queue) {
		return c.json({ message: 'Queue not found' }, 404)
	}

	const existing = await db
		.select()
		.from(queuePlayers)
		.where(and(eq(queuePlayers.queueId, id), eq(queuePlayers.discordId, discordId)))
		.get()

	if (!existing) {
		return c.json({ message: 'Player not found' }, 404)
	}

	await db.delete(queuePlayers).where(and(eq(queuePlayers.queueId, id), eq(queuePlayers.discordId, discordId)))

	if (queue.status === 'full') {
		await db.update(queues).set({ status: 'open' }).where(eq(queues.id, id))
	}

	const players = await db.select().from(queuePlayers).where(eq(queuePlayers.queueId, id))

	return c.json({ count: players.length }, 200)
})

export default app
