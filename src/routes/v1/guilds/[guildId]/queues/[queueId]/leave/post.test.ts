import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { env } from '@test/setup'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { guildQueuePlayers, guildQueues, guilds, users } from '@/db/schema'
import { typedApp } from './post'

describe('POST /v1/guilds/:guildId/queues/:queueId/leave', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('leaves queue successfully', async () => {
		const db = drizzle(env.DB)
		const queueId = ctx.generateQueueId()
		await db.insert(users).values([{ discordId: ctx.discordId }, { discordId: ctx.discordId2 }])
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
		await db.insert(guildQueuePlayers).values([
			{
				queueId,
				discordId: ctx.discordId,
				mainRole: 'MIDDLE',
				subRole: 'TOP',
			},
			{
				queueId,
				discordId: ctx.discordId2,
				mainRole: 'BOTTOM',
				subRole: 'SUPPORT',
			},
		])

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].leave.$post(
			{
				param: { guildId: ctx.guildId, queueId },
				json: { discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.currentCount).toBe(1)
			expect(data.capacity).toBe(10)
			expect(data.players).toHaveLength(1)
			expect(data.players.at(0)?.discordId).toBe(ctx.discordId2)
		}

		// Verify player was removed
		const players = await db
			.select()
			.from(guildQueuePlayers)
			.where(eq(guildQueuePlayers.queueId, queueId))
			.all()
		expect(players).toHaveLength(1)
		expect(players.at(0)?.discordId).toBe(ctx.discordId2)
	})

	it('returns empty players list when last player leaves', async () => {
		const db = drizzle(env.DB)
		const queueId = ctx.generateQueueId()
		await db.insert(users).values({ discordId: ctx.discordId })
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
		await db.insert(guildQueuePlayers).values({
			queueId,
			discordId: ctx.discordId,
			mainRole: 'MIDDLE',
			subRole: 'TOP',
		})

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].leave.$post(
			{
				param: { guildId: ctx.guildId, queueId },
				json: { discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.currentCount).toBe(0)
			expect(data.players).toHaveLength(0)
		}
	})

	it('returns 404 when queue not found', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].leave.$post(
			{
				param: { guildId: ctx.guildId, queueId: 'nonexistent' },
				json: { discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Queue not found')
		}
	})

	it('returns 404 when not in queue', async () => {
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

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].leave.$post(
			{
				param: { guildId: ctx.guildId, queueId },
				json: { discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Not in queue')
		}
	})
})
