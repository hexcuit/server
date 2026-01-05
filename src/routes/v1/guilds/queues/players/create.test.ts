import { beforeEach, describe, expect, it } from 'bun:test'
import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { env } from '@test/setup'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { guildQueues, guilds, users } from '@/db/schema'
import { typedApp } from './create'

describe('POST /v1/guilds/:guildId/queues/:queueId/players', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('adds player to queue', async () => {
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

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].players.$post(
			{
				param: { guildId: ctx.guildId, queueId: queue.id },
				json: {
					discordId: ctx.discordId,
					mainRole: 'MIDDLE',
					subRole: 'TOP',
				},
			},
			authHeaders,
		)

		expect(res.status).toBe(201)

		if (res.ok) {
			const data = await res.json()
			expect(data.discordId).toBe(ctx.discordId)
			expect(data.mainRole).toBe('MIDDLE')
			expect(data.subRole).toBe('TOP')
			expect(data.joinedAt).toBeDefined()
		}
	})

	it('returns 404 when queue not found', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].players.$post(
			{
				param: { guildId: ctx.guildId, queueId: 'nonexistent' },
				json: {
					discordId: ctx.discordId,
					mainRole: 'MIDDLE',
					subRole: 'TOP',
				},
			},
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Queue not found')
		}
	})

	it('returns 409 when player already in queue', async () => {
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

		// Add player first time
		await client.v1.guilds[':guildId'].queues[':queueId'].players.$post(
			{
				param: { guildId: ctx.guildId, queueId: queue.id },
				json: {
					discordId: ctx.discordId,
					mainRole: 'MIDDLE',
					subRole: 'TOP',
				},
			},
			authHeaders,
		)

		// Try to add same player again
		const res = await client.v1.guilds[':guildId'].queues[':queueId'].players.$post(
			{
				param: { guildId: ctx.guildId, queueId: queue.id },
				json: {
					discordId: ctx.discordId,
					mainRole: 'BOTTOM',
					subRole: 'SUPPORT',
				},
			},
			authHeaders,
		)

		expect(res.status).toBe(409)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Player already in queue')
		}
	})
})
