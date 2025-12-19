import { env } from 'cloudflare:test'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { authHeaders, createTestContext, type TestContext } from '@/__tests__/test-utils'
import { queues } from '@/db/schema'
import { typedApp } from '@/routes/v1/queues/create'

describe('createQueue', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(async () => {
		ctx = createTestContext()
	})

	it('creates a new queue and returns 201', async () => {
		const queueId = ctx.generateQueueId()

		const res = await client.v1.queues.$post(
			{
				json: {
					id: queueId,
					guildId: ctx.guildId,
					channelId: ctx.channelId,
					messageId: ctx.messageId,
					creatorId: ctx.discordId,
					type: 'normal',
					anonymous: false,
				},
			},
			authHeaders,
		)

		expect(res.ok).toBe(true)
		expect(res.status).toBe(201)

		const data = await res.json()
		expect(data.queue.id).toBe(queueId)

		const db = drizzle(env.DB)
		const saved = await db.select().from(queues).where(eq(queues.id, queueId)).get()

		expect(saved).toBeDefined()
		expect(saved?.guildId).toBe(ctx.guildId)
		expect(saved?.status).toBe('open')
	})
})
