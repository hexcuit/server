import { beforeEach, describe, expect, it } from 'bun:test'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, type TestContext } from '@/__tests__/test-utils'
import { guildQueuePlayers, guildQueues, guilds, users } from '@/db/schema'
import { typedApp } from './get'

describe('GET /v1/guilds/:guildId/queues/:queueId', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('returns queue with players', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values({ discordId: ctx.discordId })

		const [queue] = (await db
			.insert(guildQueues)
			.values({
				guildId: ctx.guildId,
				channelId: 'channel_123',
				messageId: `message_${ctx.guildId}`,
				creatorId: ctx.discordId,
				type: 'ranked',
				anonymous: false,
				capacity: 10,
				status: 'open',
			})
			.returning()) as [typeof guildQueues.$inferSelect]

		await db.insert(guildQueuePlayers).values({
			queueId: queue.id,
			discordId: ctx.discordId,
			mainRole: 'MIDDLE',
			subRole: 'TOP',
		})

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].$get(
			{
				param: { guildId: ctx.guildId, queueId: queue.id },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.id).toBe(queue.id)
			expect(data.type).toBe('ranked')
			expect(data.status).toBe('open')
			expect(data.players).toHaveLength(1)
			expect(data.players[0]?.discordId).toBe(ctx.discordId)
			expect(data.players[0]?.mainRole).toBe('MIDDLE')
		}
	})

	it('returns 404 when guild not found', async () => {
		const res = await client.v1.guilds[':guildId'].queues[':queueId'].$get(
			{
				param: { guildId: 'nonexistent', queueId: 'some-queue-id' },
			},
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

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].$get(
			{
				param: { guildId: ctx.guildId, queueId: 'nonexistent' },
			},
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Queue not found')
		}
	})
})
