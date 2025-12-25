import { beforeEach, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { guildQueues } from '@/db/schema'
import { typedApp } from './remove'

describe('removeQueue', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext
	let queueId: string

	beforeEach(async () => {
		ctx = createTestContext()
		queueId = ctx.generateQueueId()
		const db = drizzle(env.DB)
		await setupTestUsers(db, ctx)

		await db.insert(guildQueues).values({
			id: queueId,
			guildId: ctx.guildId,
			channelId: ctx.channelId,
			messageId: ctx.messageId,
			creatorId: ctx.discordId,
			type: 'normal',
			anonymous: false,
			capacity: 10,
			status: 'open',
		})
	})

	it('deletes queue and returns 200', async () => {
		const res = await client.v1.guilds[':guildId'].queues[':id'].$delete(
			{ param: { guildId: ctx.guildId, id: queueId } },
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.removed).toBe(true)
		}

		const db = drizzle(env.DB)
		const deleted = await db.select().from(guildQueues).where(eq(guildQueues.id, queueId)).get()
		expect(deleted).toBeUndefined()
	})

	it('returns 404 when queue does not exist', async () => {
		const nonExistentId = ctx.generateQueueId()
		const res = await client.v1.guilds[':guildId'].queues[':id'].$delete(
			{ param: { guildId: ctx.guildId, id: nonExistentId } },
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Queue not found')
		}
	})

	it('returns 404 when guildId does not match', async () => {
		const otherGuildId = 'other-guild-id'
		const res = await client.v1.guilds[':guildId'].queues[':id'].$delete(
			{ param: { guildId: otherGuildId, id: queueId } },
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Queue not found')
		}
	})
})
