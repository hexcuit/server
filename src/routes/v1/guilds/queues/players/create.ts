import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import { guildQueuePlayers, guildQueues, guilds, users } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
		queueId: z.string().openapi({ description: 'Queue ID' }),
	})
	.openapi('CreateQueuePlayerParam')

const BodySchema = createInsertSchema(guildQueuePlayers)
	.pick({ discordId: true, mainRole: true, subRole: true })
	.openapi('CreateQueuePlayerBody')

const ResponseSchema = createSelectSchema(guildQueuePlayers)
	.pick({ discordId: true, mainRole: true, subRole: true, joinedAt: true })
	.openapi('CreateQueuePlayerResponse')

const route = createRoute({
	method: 'post',
	path: '/v1/guilds/{guildId}/queues/{queueId}/players',
	tags: ['QueuePlayers'],
	summary: 'Join queue',
	description: 'Add player to queue',
	request: {
		params: ParamSchema,
		body: { content: { 'application/json': { schema: BodySchema } } },
	},
	responses: {
		201: {
			description: 'Player added to queue',
			content: { 'application/json': { schema: ResponseSchema } },
		},
		404: {
			description: 'Guild or queue not found',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
		409: {
			description: 'Player already in queue',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId, queueId } = c.req.valid('param')
	const body = c.req.valid('json')
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

	// Check if user exists
	const user = await db.select().from(users).where(eq(users.discordId, body.discordId)).get()

	if (!user) {
		return c.json({ message: 'User not found' }, 404)
	}

	// Add player
	const [player] = await db
		.insert(guildQueuePlayers)
		.values({
			queueId,
			...body,
		})
		.onConflictDoNothing()
		.returning({
			discordId: guildQueuePlayers.discordId,
			mainRole: guildQueuePlayers.mainRole,
			subRole: guildQueuePlayers.subRole,
			joinedAt: guildQueuePlayers.joinedAt,
		})

	if (!player) {
		return c.json({ message: 'Player already in queue' }, 409)
	}

	return c.json(player, 201)
})

export default app
