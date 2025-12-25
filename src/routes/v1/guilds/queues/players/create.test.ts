import { beforeEach, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { guildQueuePlayers, guildQueues } from '@/db/schema'
import { typedApp } from './create'

describe('createQueuePlayer', () => {
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

	it('joins queue and returns 201', async () => {
		const res = await client.v1.guilds[':guildId'].queues[':id'].players.$post(
			{
				param: { guildId: ctx.guildId, id: queueId },
				json: {
					discordId: ctx.discordId2,
					mainRole: 'MIDDLE',
					subRole: 'TOP',
				},
			},
			authHeaders,
		)

		expect(res.ok).toBe(true)
		expect(res.status).toBe(201)

		if (res.ok) {
			const data = await res.json()
			expect(data.player.discordId).toBe(ctx.discordId2)
			expect(data.player.mainRole).toBe('MIDDLE')
			expect(data.player.subRole).toBe('TOP')
			expect(data.count).toBe(1)
			expect(data.isFull).toBe(false)
		}
	})

	it('returns 404 for non-existent queue', async () => {
		const res = await client.v1.guilds[':guildId'].queues[':id'].players.$post(
			{
				param: { guildId: ctx.guildId, id: crypto.randomUUID() },
				json: { discordId: ctx.discordId2 },
			},
			authHeaders,
		)

		expect(res.ok).toBe(false)
		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Queue not found')
		}
	})

	it('returns 400 when already joined', async () => {
		await client.v1.guilds[':guildId'].queues[':id'].players.$post(
			{
				param: { guildId: ctx.guildId, id: queueId },
				json: { discordId: ctx.discordId2 },
			},
			authHeaders,
		)

		const res = await client.v1.guilds[':guildId'].queues[':id'].players.$post(
			{
				param: { guildId: ctx.guildId, id: queueId },
				json: { discordId: ctx.discordId2 },
			},
			authHeaders,
		)

		expect(res.ok).toBe(false)
		expect(res.status).toBe(400)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Already joined')
		}
	})

	it('returns 400 when queue is not open', async () => {
		const db = drizzle(env.DB)
		await db.update(guildQueues).set({ status: 'full' }).where(eq(guildQueues.id, queueId))

		const res = await client.v1.guilds[':guildId'].queues[':id'].players.$post(
			{
				param: { guildId: ctx.guildId, id: queueId },
				json: { discordId: ctx.discordId2 },
			},
			authHeaders,
		)

		expect(res.ok).toBe(false)
		expect(res.status).toBe(400)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Queue is not open')
		}
	})

	it('returns 400 when queue is full', async () => {
		const db = drizzle(env.DB)
		const smallQueueId = ctx.generateQueueId()

		await db.insert(guildQueues).values({
			id: smallQueueId,
			guildId: ctx.guildId,
			channelId: ctx.channelId,
			messageId: ctx.messageId,
			creatorId: ctx.discordId,
			type: 'normal',
			anonymous: false,
			status: 'open',
			capacity: 1,
		})

		await db.insert(guildQueuePlayers).values({
			queueId: smallQueueId,
			discordId: ctx.discordId,
		})

		const res = await client.v1.guilds[':guildId'].queues[':id'].players.$post(
			{
				param: { guildId: ctx.guildId, id: smallQueueId },
				json: { discordId: ctx.discordId2 },
			},
			authHeaders,
		)

		expect(res.ok).toBe(false)
		expect(res.status).toBe(400)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Queue is full')
		}
	})

	it('sets queue status to full when capacity is reached', async () => {
		const db = drizzle(env.DB)
		const smallQueueId = ctx.generateQueueId()

		await db.insert(guildQueues).values({
			id: smallQueueId,
			guildId: ctx.guildId,
			channelId: ctx.channelId,
			messageId: ctx.messageId,
			creatorId: ctx.discordId,
			type: 'normal',
			anonymous: false,
			status: 'open',
			capacity: 1,
		})

		const res = await client.v1.guilds[':guildId'].queues[':id'].players.$post(
			{
				param: { guildId: ctx.guildId, id: smallQueueId },
				json: { discordId: ctx.discordId2 },
			},
			authHeaders,
		)

		expect(res.ok).toBe(true)
		expect(res.status).toBe(201)

		if (res.ok) {
			const data = await res.json()
			expect(data.isFull).toBe(true)
			expect(data.count).toBe(1)
		}

		const queue = await db.select().from(guildQueues).where(eq(guildQueues.id, smallQueueId)).get()
		expect(queue?.status).toBe('full')
	})
})
