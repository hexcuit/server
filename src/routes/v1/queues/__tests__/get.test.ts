import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { queues } from '@/db/schema'
import { app } from '@/index'

describe('GET /v1/queues/{id}', () => {
	let ctx: TestContext
	let queueId: string

	beforeEach(async () => {
		ctx = createTestContext()
		queueId = ctx.generateQueueId()
		const db = drizzle(env.DB)
		await setupTestUsers(db, ctx)

		await db.insert(queues).values({
			id: queueId,
			guildId: ctx.guildId,
			channelId: ctx.channelId,
			messageId: ctx.messageId,
			creatorId: ctx.discordId,
			type: 'normal',
			anonymous: false,
			status: 'open',
		})
	})

	it('returns queue with participants', async () => {
		const res = await app.request(
			`/v1/queues/${queueId}`,
			{
				method: 'GET',
				headers: {
					'x-api-key': env.API_KEY,
				},
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as {
			queue: { id: string }
			players: unknown[]
			count: number
		}
		expect(data.queue.id).toBe(queueId)
		expect(data.players).toEqual([])
		expect(data.count).toBe(0)
	})

	it('returns 404 for non-existent queue', async () => {
		const res = await app.request(
			`/v1/queues/${crypto.randomUUID()}`,
			{
				method: 'GET',
				headers: {
					'x-api-key': env.API_KEY,
				},
			},
			env,
		)

		expect(res.status).toBe(404)
	})
})
