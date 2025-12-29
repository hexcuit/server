import { beforeEach, describe, expect, it } from 'bun:test'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, type TestContext } from '@/__tests__/test-utils'
import { guilds, users } from '@/db/schema'
import { typedApp } from './create'

describe('POST /v1/guilds/:guildId/queues', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('creates a queue', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values({ discordId: ctx.discordId })

		const res = await client.v1.guilds[':guildId'].queues.$post(
			{
				param: { guildId: ctx.guildId },
				json: {
					channelId: 'channel_123',
					messageId: `message_${ctx.guildId}`,
					creatorId: ctx.discordId,
					type: 'ranked',
					anonymous: false,
					capacity: 10,
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
	})

	it('returns 409 when queue with same messageId exists', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const messageId = `duplicate_${ctx.guildId}`

		// Create first queue
		await client.v1.guilds[':guildId'].queues.$post(
			{
				param: { guildId: ctx.guildId },
				json: {
					channelId: 'channel_123',
					messageId,
					creatorId: null,
					type: 'normal',
					anonymous: false,
					capacity: 10,
				},
			},
			authHeaders,
		)

		// Try to create second queue with same messageId
		const res = await client.v1.guilds[':guildId'].queues.$post(
			{
				param: { guildId: ctx.guildId },
				json: {
					channelId: 'channel_456',
					messageId,
					creatorId: null,
					type: 'ranked',
					anonymous: true,
					capacity: 5,
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
