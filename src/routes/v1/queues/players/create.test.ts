import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { authHeaders, createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { queues } from '@/db/schema'
import { typedApp } from '@/routes/v1/queues/players/create'

describe('createQueuePlayer', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext
	let queueId: string

	beforeEach(async () => {
		ctx = createTestContext()
		queueId = ctx.generateQueueId()
		const db = drizzle(env.DB)
		await setupTestUsers(db, ctx)

		await db.insert(queues).values({
			id: queueId,
			guildId: ctx.guildId,
			channelId: ctx.channelId,
			messageId: ctx.messageId,
			creatorId: ctx.discordId,
			type: 'normal',
			anonymous: false,
			status: 'open',
		})
	})

	it('joins queue and returns 201', async () => {
		const res = await client.v1.queues[':id'].players.$post(
			{
				param: { id: queueId },
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
		const res = await client.v1.queues[':id'].players.$post(
			{
				param: { id: crypto.randomUUID() },
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
		await client.v1.queues[':id'].players.$post(
			{
				param: { id: queueId },
				json: { discordId: ctx.discordId2 },
			},
			authHeaders,
		)

		const res = await client.v1.queues[':id'].players.$post(
			{
				param: { id: queueId },
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
})
