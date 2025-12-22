import { beforeEach, describe, expect, it } from 'bun:test'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { queues } from '@/db/schema'
import { typedApp } from '@/routes/v1/queues/get'

describe('getQueue', () => {
	const client = testClient(typedApp, env)
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
		const res = await client.v1.queues[':id'].$get({ param: { id: queueId } }, authHeaders)

		expect(res.ok).toBe(true)
		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.queue.id).toBe(queueId)
			expect(data.players).toEqual([])
			expect(data.count).toBe(0)
		}
	})

	it('returns 404 for non-existent queue', async () => {
		const res = await client.v1.queues[':id'].$get({ param: { id: crypto.randomUUID() } }, authHeaders)

		expect(res.ok).toBe(false)
		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Queue not found')
		}
	})
})
