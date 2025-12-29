import { beforeEach, describe, expect, it } from 'bun:test'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, type TestContext } from '@/__tests__/test-utils'
import { guildQueuePlayers, guildQueues, guilds, users } from '@/db/schema'
import { typedApp } from './delete'

describe('DELETE /v1/guilds/:guildId/queues/:queueId/players/:discordId', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('removes player from queue', async () => {
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

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].players[':discordId'].$delete(
			{
				param: { guildId: ctx.guildId, queueId: queue.id, discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(204)

		// Verify deletion
		const player = await db
			.select()
			.from(guildQueuePlayers)
			.where(and(eq(guildQueuePlayers.queueId, queue.id), eq(guildQueuePlayers.discordId, ctx.discordId)))
			.get()

		expect(player).toBeUndefined()
	})

	it('returns 404 when guild not found', async () => {
		const res = await client.v1.guilds[':guildId'].queues[':queueId'].players[':discordId'].$delete(
			{
				param: { guildId: ctx.guildId, queueId: 'any-queue-id', discordId: ctx.discordId },
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

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].players[':discordId'].$delete(
			{
				param: { guildId: ctx.guildId, queueId: 'nonexistent', discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Queue not found')
		}
	})

	it('returns 404 when player not in queue', async () => {
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

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].players[':discordId'].$delete(
			{
				param: { guildId: ctx.guildId, queueId: queue.id, discordId: 'nonexistent' },
			},
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Player not found in queue')
		}
	})
})
