import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import { guildQueuePlayers, guildQueues, guilds, guildUserStats } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
		queueId: z.string().openapi({ description: 'Queue ID' }),
	})
	.openapi('GetQueueParam')

const PlayerSchema = z.object({
	discordId: z.string(),
	mainRole: z.string().nullable(),
	subRole: z.string().nullable(),
	rating: z.number(),
	joinedAt: z.string(),
})

const ResponseSchema = createSelectSchema(guildQueues)
	.pick({
		id: true,
		status: true,
		capacity: true,
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
	description: '募集を取得する',
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
			status: guildQueues.status,
			capacity: guildQueues.capacity,
		})
		.from(guildQueues)
		.where(and(eq(guildQueues.id, queueId), eq(guildQueues.guildId, guildId)))
		.get()

	if (!queue) {
		return c.json({ message: 'Queue not found' }, 404)
	}

	// Get players with their ratings
	const playersWithStats = await db
		.select({
			discordId: guildQueuePlayers.discordId,
			mainRole: guildQueuePlayers.mainRole,
			subRole: guildQueuePlayers.subRole,
			joinedAt: guildQueuePlayers.joinedAt,
			rating: guildUserStats.rating,
		})
		.from(guildQueuePlayers)
		.leftJoin(
			guildUserStats,
			and(eq(guildQueuePlayers.discordId, guildUserStats.discordId), eq(guildUserStats.guildId, guildId)),
		)
		.where(eq(guildQueuePlayers.queueId, queueId))

	// Default rating for players without stats (use guild settings default: 1200)
	const players = playersWithStats.map((p) => ({
		discordId: p.discordId,
		mainRole: p.mainRole,
		subRole: p.subRole,
		rating: p.rating ?? 1200,
		joinedAt: p.joinedAt,
	}))

	return c.json({ ...queue, players }, 200)
})

export default app
