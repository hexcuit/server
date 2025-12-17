import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { HTTPException } from 'hono/http-exception'
import { queuePlayers, queues } from '@/db/schema'
import { LeaveResponseSchema, PlayerPathParamsSchema } from './schemas'

const deletePlayerRoute = createRoute({
	method: 'delete',
	path: '/{id}/players/{discordId}',
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
	},
})

export const deletePlayerRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(
	deletePlayerRoute,
	async (c) => {
		const { id, discordId } = c.req.valid('param')
		const db = drizzle(c.env.DB)

		const existing = await db
			.select()
			.from(queuePlayers)
			.where(and(eq(queuePlayers.queueId, id), eq(queuePlayers.discordId, discordId)))
			.get()

		if (!existing) {
			throw new HTTPException(404, { message: 'Player not found' })
		}

		await db.delete(queuePlayers).where(and(eq(queuePlayers.queueId, id), eq(queuePlayers.discordId, discordId)))

		const queue = await db.select().from(queues).where(eq(queues.id, id)).get()

		if (queue?.status === 'full') {
			await db.update(queues).set({ status: 'open' }).where(eq(queues.id, id))
		}

		const players = await db.select().from(queuePlayers).where(eq(queuePlayers.queueId, id))

		return c.json({ count: players.length })
	},
)
