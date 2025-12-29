import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import { guildQueuePlayers, guildQueues, guilds } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
		queueId: z.string().openapi({ description: 'Queue ID' }),
	})
	.openapi('GetQueueParam')

const PlayerSchema = createSelectSchema(guildQueuePlayers).pick({
	discordId: true,
	mainRole: true,
	subRole: true,
	joinedAt: true,
})

const ResponseSchema = createSelectSchema(guildQueues)
	.pick({
		id: true,
		channelId: true,
		messageId: true,
		creatorId: true,
		type: true,
		anonymous: true,
		capacity: true,
		status: true,
		createdAt: true,
	})
	.extend({
		players: z.array(PlayerSchema),
	})
	.openapi('GetQueueResponse')

const route = createRoute({
	method: 'get',
	path: '/v1/guilds/{guildId}/queues/{queueId}',
	tags: ['Queues'],
	summary: 'Get queue',
	description: 'Get queue by ID',
	request: {
		params: ParamSchema,
	},
	responses: {
		200: {
			description: 'Queue found',
			content: { 'application/json': { schema: ResponseSchema } },
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

	// Get queue
	const queue = await db
		.select({
			id: guildQueues.id,
			channelId: guildQueues.channelId,
			messageId: guildQueues.messageId,
			creatorId: guildQueues.creatorId,
			type: guildQueues.type,
			anonymous: guildQueues.anonymous,
			capacity: guildQueues.capacity,
			status: guildQueues.status,
			createdAt: guildQueues.createdAt,
		})
		.from(guildQueues)
		.where(and(eq(guildQueues.id, queueId), eq(guildQueues.guildId, guildId)))
		.get()

	if (!queue) {
		return c.json({ message: 'Queue not found' }, 404)
	}

	// Get players
	const players = await db
		.select({
			discordId: guildQueuePlayers.discordId,
			mainRole: guildQueuePlayers.mainRole,
			subRole: guildQueuePlayers.subRole,
			joinedAt: guildQueuePlayers.joinedAt,
		})
		.from(guildQueuePlayers)
		.where(eq(guildQueuePlayers.queueId, queueId))

	return c.json({ ...queue, players }, 200)
})

export default app
