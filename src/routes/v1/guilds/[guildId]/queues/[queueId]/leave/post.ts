import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { ROLE_PREFERENCES } from '@/constants'
import { createDb } from '@/db'
import { guildQueuePlayers, guildQueues } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
		queueId: z.string().openapi({ description: 'Queue ID' }),
	})
	.openapi('LeaveQueueParam')

const BodySchema = z
	.object({
		discordId: z.string(),
	})
	.openapi('LeaveQueueBody')

const PlayerSchema = z.object({
	discordId: z.string(),
	mainRole: z.enum(ROLE_PREFERENCES),
	subRole: z.enum(ROLE_PREFERENCES),
})

const ResponseSchema = z
	.object({
		currentCount: z.number(),
		capacity: z.number(),
		creatorId: z.string().nullable(),
		players: z.array(PlayerSchema),
	})
	.openapi('LeaveQueueResponse')

const route = createRoute({
	method: 'post',
	path: '/v1/guilds/{guildId}/queues/{queueId}/leave',
	tags: ['Queues'],
	summary: 'Leave queue',
	description: 'Leave a queue',
	request: {
		params: ParamSchema,
		body: { content: { 'application/json': { schema: BodySchema } } },
	},
	responses: {
		200: {
			description: 'Left queue',
			content: { 'application/json': { schema: ResponseSchema } },
		},
		404: {
			description: 'Queue not found or not in queue',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId, queueId } = c.req.valid('param')
	const { discordId } = c.req.valid('json')
	const db = createDb(c.env.HYPERDRIVE.connectionString)

	// Check if queue exists
	const [queue] = await db
		.select()
		.from(guildQueues)
		.where(and(eq(guildQueues.id, queueId), eq(guildQueues.guildId, guildId)))

	if (!queue) {
		return c.json({ message: 'Queue not found' }, 404)
	}

	// Delete player
	const result = await db
		.delete(guildQueuePlayers)
		.where(and(eq(guildQueuePlayers.queueId, queueId), eq(guildQueuePlayers.discordId, discordId)))
		.returning()

	if (result.length === 0) {
		return c.json({ message: 'Not in queue' }, 404)
	}

	// Get remaining players
	const remainingPlayers = await db
		.select({
			discordId: guildQueuePlayers.discordId,
			mainRole: guildQueuePlayers.mainRole,
			subRole: guildQueuePlayers.subRole,
		})
		.from(guildQueuePlayers)
		.where(eq(guildQueuePlayers.queueId, queueId))

	return c.json(
		{
			currentCount: remainingPlayers.length,
			capacity: queue.capacity,
			creatorId: queue.creatorId,
			players: remainingPlayers,
		},
		200,
	)
})

export default app
