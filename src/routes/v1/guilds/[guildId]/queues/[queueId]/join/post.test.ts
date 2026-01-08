import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { env } from '@test/setup'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { guildMatches, guildQueuePlayers, guildQueues, guilds, users } from '@/db/schema'
import { typedApp } from './post'

describe('POST /v1/guilds/:guildId/queues/:queueId/join', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('joins queue successfully', async () => {
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

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].join.$post(
			{
				param: { guildId: ctx.guildId, queueId },
				json: { discordId: ctx.discordId, mainRole: 'MIDDLE', subRole: 'TOP' },
			},
			authHeaders,
		)

		expect(res.status).toBe(201)

		if (res.ok) {
			const data = await res.json()
			expect(data.status).toBe('joined')
			if (data.status === 'joined') {
				expect(data.currentCount).toBe(1)
				expect(data.capacity).toBe(10)
				expect(data.players).toHaveLength(1)
				expect(data.players.at(0)?.discordId).toBe(ctx.discordId)
				expect(data.players.at(0)?.mainRole).toBe('MIDDLE')
				expect(data.players.at(0)?.subRole).toBe('TOP')
			}
		}

		// Verify user was auto-created
		const user = await db.select().from(users).where(eq(users.discordId, ctx.discordId)).get()
		expect(user).toBeDefined()
	})

	it('joins queue with default roles (FILL)', async () => {
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

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].join.$post(
			{
				param: { guildId: ctx.guildId, queueId },
				json: { discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(201)

		if (res.ok) {
			const data = await res.json()
			if (data.status === 'joined') {
				expect(data.players.at(0)?.mainRole).toBe('FILL')
				expect(data.players.at(0)?.subRole).toBe('FILL')
			}
		}
	})

	it('starts match when queue is full', async () => {
		const db = drizzle(env.DB)
		const queueId = ctx.generateQueueId()
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(guildQueues).values({
			id: queueId,
			guildId: ctx.guildId,
			channelId: ctx.channelId,
			messageId: ctx.messageId,
			type: 'ranked',
			capacity: 2, // Small capacity for testing
			anonymous: false,
			status: 'open',
		})

		// First player joins
		await db.insert(users).values({ discordId: ctx.discordId })
		await db.insert(guildQueuePlayers).values({
			queueId,
			discordId: ctx.discordId,
			mainRole: 'MIDDLE',
			subRole: 'TOP',
		})

		// Second player joins (fills queue)
		const res = await client.v1.guilds[':guildId'].queues[':queueId'].join.$post(
			{
				param: { guildId: ctx.guildId, queueId },
				json: { discordId: ctx.discordId2, mainRole: 'BOTTOM', subRole: 'SUPPORT' },
			},
			authHeaders,
		)

		expect(res.status).toBe(201)

		if (res.ok) {
			const data = await res.json()
			expect(data.status).toBe('match_started')
			if (data.status === 'match_started') {
				expect(data.match.id).toBeDefined()
				expect(data.match.teamAssignments).toBeDefined()
			}
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

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].join.$post(
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

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].join.$post(
			{
				param: { guildId: ctx.guildId, queueId },
				json: { discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(400)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Queue is closed')
		}
	})

	it('returns 409 when already joined', async () => {
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

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].join.$post(
			{
				param: { guildId: ctx.guildId, queueId },
				json: { discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(409)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Already joined')
		}
	})

	it('returns 400 when queue is full', async () => {
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
			capacity: 1,
			anonymous: false,
			status: 'open',
		})
		await db.insert(guildQueuePlayers).values({
			queueId,
			discordId: ctx.discordId,
			mainRole: 'MIDDLE',
			subRole: 'TOP',
		})

		const res = await client.v1.guilds[':guildId'].queues[':queueId'].join.$post(
			{
				param: { guildId: ctx.guildId, queueId },
				json: { discordId: ctx.discordId2 },
			},
			authHeaders,
		)

		expect(res.status).toBe(400)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Queue is full')
		}
	})
})
