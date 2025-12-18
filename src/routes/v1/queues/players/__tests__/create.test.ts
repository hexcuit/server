import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { queues } from '@/db/schema'
import { app } from '@/index'

describe('POST /v1/queues/{id}/players', () => {
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
		const res = await app.request(
			`/v1/queues/${queueId}/players`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': env.API_KEY,
				},
				body: JSON.stringify({
					discordId: ctx.discordId2,
					mainRole: 'MIDDLE',
					subRole: 'TOP',
				}),
			},
			env,
		)

		expect(res.status).toBe(201)

		const data = (await res.json()) as {
			player: { discordId: string; mainRole: string; subRole: string }
			count: number
			isFull: boolean
		}
		expect(data.player.discordId).toBe(ctx.discordId2)
		expect(data.player.mainRole).toBe('MIDDLE')
		expect(data.player.subRole).toBe('TOP')
		expect(data.count).toBe(1)
		expect(data.isFull).toBe(false)
	})

	it('returns 404 for non-existent queue', async () => {
		const res = await app.request(
			`/v1/queues/${crypto.randomUUID()}/players`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': env.API_KEY,
				},
				body: JSON.stringify({
					discordId: ctx.discordId2,
				}),
			},
			env,
		)

		expect(res.status).toBe(404)
	})

	it('returns 400 when already joined', async () => {
		// Join first
		await app.request(
			`/v1/queues/${queueId}/players`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': env.API_KEY,
				},
				body: JSON.stringify({
					discordId: ctx.discordId2,
				}),
			},
			env,
		)

		// Try to join again
		const res = await app.request(
			`/v1/queues/${queueId}/players`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': env.API_KEY,
				},
				body: JSON.stringify({
					discordId: ctx.discordId2,
				}),
			},
			env,
		)

		expect(res.status).toBe(400)
	})
})
