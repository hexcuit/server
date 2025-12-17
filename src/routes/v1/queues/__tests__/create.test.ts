import { env } from 'cloudflare:test'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTestContext, type TestContext } from '@/__tests__/test-utils'
import { queues } from '@/db/schema'
import { app } from '@/index'

describe('POST /v1/queues', () => {
	let ctx: TestContext

	beforeEach(async () => {
		ctx = createTestContext()
	})

	it('creates a new queue and returns 201', async () => {
		const queueId = ctx.generateQueueId()

		const res = await app.request(
			'/v1/queues',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': env.API_KEY,
				},
				body: JSON.stringify({
					id: queueId,
					guildId: ctx.guildId,
					channelId: ctx.channelId,
					messageId: ctx.messageId,
					creatorId: ctx.discordId,
					type: 'normal',
					anonymous: false,
				}),
			},
			env,
		)

		expect(res.status).toBe(201)

		const data = (await res.json()) as { queue: { id: string } }
		expect(data.queue.id).toBe(queueId)

		const db = drizzle(env.DB)
		const saved = await db.select().from(queues).where(eq(queues.id, queueId)).get()

		expect(saved).toBeDefined()
		expect(saved?.guildId).toBe(ctx.guildId)
		expect(saved?.status).toBe('open')
	})

	it('returns 401 without API key', async () => {
		const queueId = ctx.generateQueueId()

		const res = await app.request(
			'/v1/queues',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					id: queueId,
					guildId: ctx.guildId,
					channelId: ctx.channelId,
					messageId: ctx.messageId,
					creatorId: ctx.discordId,
					type: 'normal',
					anonymous: false,
				}),
			},
			env,
		)

		expect(res.status).toBe(401)
	})
})
