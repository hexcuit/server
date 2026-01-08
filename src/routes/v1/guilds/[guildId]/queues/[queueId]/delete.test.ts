import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { env } from '@test/setup'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { guildQueues, guilds } from '@/db/schema'
import { typedApp } from './delete'

describe('DELETE /v1/guilds/:guildId/queues/:queueId', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('deletes queue', async () => {
		const db = drizzle(env.DB)
		const queueId = ctx.generateQueueId()
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(guildQueues).values({
			id: queueId,
			guildId: ctx.guildId,
			channelId: ctx.channelId,
			messageId: ctx.messageId,
			type: 'ranked',
			capacity: 10,
			anonymous: false,
			status: 'open',
		})

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].$delete(
			{ param: { guildId: ctx.guildId, queueId } },
			authHeaders,
		)

		expect(res.status).toBe(204)

		// Verify queue was deleted
		const queue = await db.select().from(guildQueues).where(eq(guildQueues.id, queueId)).get()
		expect(queue).toBeUndefined()
	})

	it('returns 404 when guild not found', async () => {
		const res = await client.v1.guilds[':guildId'].queues[':queueId'].$delete(
			{ param: { guildId: 'nonexistent', queueId: ctx.generateQueueId() } },
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Guild not found')
		}
	})

	it('returns 404 when queue not found', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].$delete(
			{ param: { guildId: ctx.guildId, queueId: 'nonexistent' } },
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Queue not found')
		}
	})

	it('returns 404 when queue belongs to different guild', async () => {
		const db = drizzle(env.DB)
		const queueId = ctx.generateQueueId()
		const otherGuildId = `other-${ctx.guildId}`

		await db.insert(guilds).values([{ guildId: ctx.guildId }, { guildId: otherGuildId }])
		await db.insert(guildQueues).values({
			id: queueId,
			guildId: otherGuildId,
			channelId: ctx.channelId,
			messageId: ctx.messageId,
			type: 'ranked',
			capacity: 10,
			anonymous: false,
			status: 'open',
		})

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].$delete(
			{ param: { guildId: ctx.guildId, queueId } },
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Queue not found')
		}
	})
})
