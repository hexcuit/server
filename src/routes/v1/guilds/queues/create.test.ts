import { beforeEach, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, type TestContext } from '@/__tests__/test-utils'
import { queues } from '@/db/schema'
import { typedApp } from './create'

describe('createQueue', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(async () => {
		ctx = createTestContext()
	})

	it('creates a new queue and returns 201', async () => {
		const res = await client.v1.guilds[':guildId'].queues.$post(
			{
				param: { guildId: ctx.guildId },
				json: {
					channelId: ctx.channelId,
					messageId: ctx.messageId,
					creatorId: ctx.discordId,
					type: 'normal',
					anonymous: false,
					capacity: 10,
				},
			},
			authHeaders,
		)

		expect(res.status).toBe(201)
		expect(res.ok).toBe(true)

		const data = await res.json()
		expect(data.queue.id).toBeDefined()
		expect(typeof data.queue.id).toBe('string')

		const db = drizzle(env.DB)
		const saved = await db.select().from(queues).where(eq(queues.id, data.queue.id)).get()

		expect(saved).toBeDefined()
		expect(saved?.guildId).toBe(ctx.guildId)
		expect(saved?.status).toBe('open')
	})
})
