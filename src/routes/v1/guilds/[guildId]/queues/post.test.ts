import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { env } from '@test/setup'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { guildQueues, guilds, users } from '@/db/schema'
import { typedApp } from './post'

describe('POST /v1/guilds/:guildId/queues', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('creates queue and auto-creates guild', async () => {
		const res = await client.v1.guilds[':guildId'].queues.$post(
			{
				param: { guildId: ctx.guildId },
				json: {
					channelId: ctx.channelId,
					messageId: ctx.messageId,
					type: 'ranked',
					capacity: 10,
					anonymous: false,
				},
			},
			authHeaders,
		)

		expect(res.status).toBe(201)

		if (res.ok) {
			const data = await res.json()
			expect(data.id).toBeDefined()
			expect(data.status).toBe('open')
			expect(data.createdAt).toBeDefined()
		}

		// Verify guild was auto-created
		const db = drizzle(env.DB)
		const guild = await db.select().from(guilds).where(eq(guilds.guildId, ctx.guildId)).get()
		expect(guild).toBeDefined()
	})

	it('creates queue with creatorId and auto-creates user', async () => {
		const res = await client.v1.guilds[':guildId'].queues.$post(
			{
				param: { guildId: ctx.guildId },
				json: {
					channelId: ctx.channelId,
					messageId: ctx.messageId,
					creatorId: ctx.discordId,
					type: 'ranked',
					capacity: 10,
					anonymous: false,
				},
			},
			authHeaders,
		)

		expect(res.status).toBe(201)

		// Verify user was auto-created
		const db = drizzle(env.DB)
		const user = await db.select().from(users).where(eq(users.discordId, ctx.discordId)).get()
		expect(user).toBeDefined()
	})

	it('creates anonymous queue', async () => {
		const res = await client.v1.guilds[':guildId'].queues.$post(
			{
				param: { guildId: ctx.guildId },
				json: {
					channelId: ctx.channelId,
					messageId: ctx.messageId,
					type: 'normal',
					capacity: 10,
					anonymous: true,
				},
			},
			authHeaders,
		)

		expect(res.status).toBe(201)

		// Verify queue is anonymous
		const db = drizzle(env.DB)
		const queue = await db
			.select()
			.from(guildQueues)
			.where(eq(guildQueues.messageId, ctx.messageId))
			.get()
		expect(queue?.anonymous).toBe(true)
	})

	it('returns 409 when queue with same messageId exists', async () => {
		// Create first queue
		await client.v1.guilds[':guildId'].queues.$post(
			{
				param: { guildId: ctx.guildId },
				json: {
					channelId: ctx.channelId,
					messageId: ctx.messageId,
					type: 'ranked',
					capacity: 10,
					anonymous: false,
				},
			},
			authHeaders,
		)

		// Try to create another queue with the same messageId
		const res = await client.v1.guilds[':guildId'].queues.$post(
			{
				param: { guildId: ctx.guildId },
				json: {
					channelId: ctx.channelId,
					messageId: ctx.messageId,
					type: 'ranked',
					capacity: 10,
					anonymous: false,
				},
			},
			authHeaders,
		)

		expect(res.status).toBe(409)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Queue with this messageId already exists')
		}
	})
})
