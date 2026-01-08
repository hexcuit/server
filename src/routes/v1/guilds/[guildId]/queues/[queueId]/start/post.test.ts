import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { env } from '@test/setup'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { guildMatches, guildQueuePlayers, guildQueues, guilds, users } from '@/db/schema'
import { typedApp } from './post'

describe('POST /v1/guilds/:guildId/queues/:queueId/start', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('force starts match with 2 or more players', async () => {
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

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].start.$post(
			{ param: { guildId: ctx.guildId, queueId } },
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.match.id).toBeDefined()
			expect(data.match.teamAssignments).toBeDefined()
			expect(Object.keys(data.match.teamAssignments)).toHaveLength(2)
		}

		// Verify queue was deleted
		const queue = await db.select().from(guildQueues).where(eq(guildQueues.id, queueId)).get()
		expect(queue).toBeUndefined()

		// Verify match was created
		const matches = await db
			.select()
			.from(guildMatches)
			.where(eq(guildMatches.guildId, ctx.guildId))
			.all()
		expect(matches).toHaveLength(1)
		expect(matches.at(0)?.status).toBe('voting')
	})

	it('returns 404 when queue not found', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].start.$post(
			{ param: { guildId: ctx.guildId, queueId: 'nonexistent' } },
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Queue not found')
		}
	})

	it('returns 400 when queue is closed', async () => {
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
			status: 'closed',
		})

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].start.$post(
			{ param: { guildId: ctx.guildId, queueId } },
			authHeaders,
		)

		expect(res.status).toBe(400)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Queue is closed')
		}
	})

	it('returns 400 when not enough players', async () => {
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
		// Only 1 player
		await db.insert(guildQueuePlayers).values({
			queueId,
			discordId: ctx.discordId,
			mainRole: 'MIDDLE',
			subRole: 'TOP',
		})

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].start.$post(
			{ param: { guildId: ctx.guildId, queueId } },
			authHeaders,
		)

		expect(res.status).toBe(400)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Not enough players (minimum 2)')
		}
	})

	it('returns 400 when queue is empty', async () => {
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

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].start.$post(
			{ param: { guildId: ctx.guildId, queueId } },
			authHeaders,
		)

		expect(res.status).toBe(400)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Not enough players (minimum 2)')
		}
	})
})
