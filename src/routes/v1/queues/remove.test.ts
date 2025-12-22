import { beforeEach, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { queues } from '@/db/schema'
import { typedApp } from '@/routes/v1/queues/remove'

describe('removeQueue', () => {
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

	it('deletes queue and returns 200', async () => {
		const res = await client.v1.queues[':id'].$delete({ param: { id: queueId } }, authHeaders)

		expect(res.status).toBe(200)

		const data = await res.json()
		expect(data.removed).toBe(true)

		const db = drizzle(env.DB)
		const deleted = await db.select().from(queues).where(eq(queues.id, queueId)).get()
		expect(deleted).toBeUndefined()
	})
})
