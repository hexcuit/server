import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, count, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { HTTPException } from 'hono/http-exception'
import { queuePlayers, queues, users } from '@/db/schema'
import { QueuePathParamsSchema } from '../schemas'
import { JoinQueueBodySchema, JoinResponseSchema } from './schemas'

const createPlayerRoute = createRoute({
	method: 'post',
	path: '/{id}/players',
	tags: ['Queues'],
	summary: 'Join queue',
	description: 'Join a queue as a player',
	request: {
		params: QueuePathParamsSchema,
		body: {
			content: {
				'application/json': {
					schema: JoinQueueBodySchema,
				},
			},
		},
	},
	responses: {
		201: {
			description: 'Successfully joined queue',
			content: {
				'application/json': {
					schema: JoinResponseSchema,
				},
			},
		},
	},
})

export const createPlayerRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(
	createPlayerRoute,
	async (c) => {
		const { id } = c.req.valid('param')
		const { discordId, mainRole, subRole } = c.req.valid('json')
		const db = drizzle(c.env.DB)

		const queue = await db.select().from(queues).where(eq(queues.id, id)).get()

		if (!queue) {
			throw new HTTPException(404, { message: 'Queue not found' })
		}

		if (queue.status !== 'open') {
			throw new HTTPException(400, { message: 'Queue is not open' })
		}

		const capacity = queue.capacity

		// Fast-path check (non-atomic, but avoids unnecessary work in common case)
		const existing = await db
			.select()
			.from(queuePlayers)
			.where(and(eq(queuePlayers.queueId, id), eq(queuePlayers.discordId, discordId)))
			.get()

		if (existing) {
			throw new HTTPException(400, { message: 'Already joined' })
		}

		await db.insert(users).values({ discordId }).onConflictDoNothing()

		// Use conditional INSERT to atomically check capacity and prevent duplicates
		// NOT EXISTS ensures no duplicate even under concurrent requests
		// DB unique constraint (queue_id, discord_id) is the ultimate safety net
		const playerId = crypto.randomUUID()
		let insertResult: { meta: { changes: number } }
		try {
			insertResult = await db.run(sql`
				INSERT INTO queue_players (id, queue_id, discord_id, main_role, sub_role)
				SELECT ${playerId}, ${id}, ${discordId}, ${mainRole || null}, ${subRole || null}
				WHERE (SELECT COUNT(*) FROM queue_players WHERE queue_id = ${id}) < ${capacity}
					AND NOT EXISTS (
						SELECT 1 FROM queue_players WHERE queue_id = ${id} AND discord_id = ${discordId}
					)
			`)
		} catch (e) {
			// Handle unique constraint violation (race condition fallback)
			if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) {
				throw new HTTPException(400, { message: 'Already joined' })
			}
			throw e
		}

		// Check if insert succeeded - could fail due to capacity OR duplicate
		if (insertResult.meta.changes === 0) {
			// Re-check to provide accurate error message
			const existsNow = await db
				.select()
				.from(queuePlayers)
				.where(and(eq(queuePlayers.queueId, id), eq(queuePlayers.discordId, discordId)))
				.get()

			if (existsNow) {
				throw new HTTPException(400, { message: 'Already joined' })
			}
			throw new HTTPException(400, { message: 'Queue is full' })
		}

		// Get updated count after successful insertion
		const playerCount = await db.select({ count: count() }).from(queuePlayers).where(eq(queuePlayers.queueId, id)).get()

		const newCount = playerCount?.count || 1
		const isFull = newCount >= capacity

		if (isFull) {
			await db.update(queues).set({ status: 'full' }).where(eq(queues.id, id))
		}

		return c.json(
			{
				player: {
					discordId,
					mainRole: mainRole || null,
					subRole: subRole || null,
				},
				isFull,
				count: newCount,
			},
			201,
		)
	},
)
