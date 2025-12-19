import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { hc } from 'hono/client'
import { queuePlayers, queues } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'
import { LeaveResponseSchema, PlayerPathParamsSchema } from './schemas'

const route = createRoute({
	method: 'delete',
	path: '/v1/queues/{id}/players/{discordId}',
	tags: ['Queues'],
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
	const { id, discordId } = c.req.valid('param')
	const db = drizzle(c.env.DB)

	const existing = await db
		.select()
		.from(queuePlayers)
		.where(and(eq(queuePlayers.queueId, id), eq(queuePlayers.discordId, discordId)))
		.get()

	if (!existing) {
		return c.json({ message: 'Player not found' }, 404)
	}

	await db.delete(queuePlayers).where(and(eq(queuePlayers.queueId, id), eq(queuePlayers.discordId, discordId)))

	const queue = await db.select().from(queues).where(eq(queues.id, id)).get()

	if (queue?.status === 'full') {
		await db.update(queues).set({ status: 'open' }).where(eq(queues.id, id))
	}

	const players = await db.select().from(queuePlayers).where(eq(queuePlayers.queueId, id))

	return c.json({ count: players.length }, 200)
})

export default app

export const hcWithType = (...args: Parameters<typeof hc>) => hc<typeof typedApp>(...args)
