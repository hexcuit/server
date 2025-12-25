import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { drizzle } from 'drizzle-orm/d1'
import { guildQueues, guilds, users } from '@/db/schema'
import { GuildParamSchema } from '../schemas'
import { QueueInsertSchema, QueueSelectSchema } from './schemas'

const ParamsSchema = GuildParamSchema.openapi('CreateQueueParams')

const BodySchema = QueueInsertSchema.omit({
	id: true,
	guildId: true,
	status: true,
	createdAt: true,
	updatedAt: true,
}).openapi('CreateQueueBody')

const ResponseSchema = z
	.object({
		queue: QueueSelectSchema,
	})
	.openapi('CreateQueueResponse')

const route = createRoute({
	method: 'post',
	path: '/v1/guilds/{guildId}/queues',
	tags: ['Guild Queues'],
	summary: 'Create queue',
	description: 'Create a new queue',
	request: {
		params: ParamsSchema,
		body: {
			content: {
				'application/json': {
					schema: BodySchema,
				},
			},
		},
	},
	responses: {
		201: {
			description: 'Queue created successfully',
			content: {
				'application/json': {
					schema: ResponseSchema,
				},
			},
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId } = c.req.valid('param')
	const data = c.req.valid('json')
	const db = drizzle(c.env.DB)

	await db.batch([
		db.insert(users).values({ discordId: data.creatorId }).onConflictDoNothing(),
		db.insert(guilds).values({ guildId }).onConflictDoNothing(),
	])

	const [queue] = (await db
		.insert(guildQueues)
		.values({
			guildId,
			channelId: data.channelId,
			messageId: data.messageId,
			creatorId: data.creatorId,
			type: data.type,
			anonymous: data.anonymous,
			capacity: data.capacity,
			status: 'open',
		})
		.returning()) as [typeof guildQueues.$inferSelect]

	return c.json({ queue }, 201)
})

export default app
