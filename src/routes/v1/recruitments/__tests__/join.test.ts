import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'
import { recruitmentParticipants, recruitments, users } from '@/db/schema'
import { app } from '@/index'

describe('POST /v1/recruitments/{id}/participants', () => {
	const apiKey = 'test-api-key'
	const recruitmentId = crypto.randomUUID()
	const testGuildId = 'test-guild-123'
	const testChannelId = 'test-channel-123'
	const testMessageId = 'test-message-123'
	const testCreatorId = 'test-creator-123'
	const testUserId = 'test-user-456'

	let env: { DB: D1Database; API_KEY: string }
	let dispose: () => Promise<void>

	beforeAll(async () => {
		const proxy = await getPlatformProxy<{ DB: D1Database; API_KEY: string }>({
			configPath: './wrangler.jsonc',
		})
		env = { ...proxy.env, API_KEY: apiKey }
		dispose = proxy.dispose
	})

	afterAll(async () => {
		await dispose()
	})

	beforeEach(async () => {
		const db = drizzle(env.DB)
		await db.delete(recruitmentParticipants).where(eq(recruitmentParticipants.recruitmentId, recruitmentId))
		await db.delete(recruitments).where(eq(recruitments.id, recruitmentId))
		await db.delete(users).where(eq(users.discordId, testCreatorId))
		await db.delete(users).where(eq(users.discordId, testUserId))

		await db.insert(users).values({ discordId: testCreatorId })
		await db.insert(recruitments).values({
			id: recruitmentId,
			guildId: testGuildId,
			channelId: testChannelId,
			messageId: testMessageId,
			creatorId: testCreatorId,
			type: 'normal',
			anonymous: false,
			status: 'open',
		})
	})

	it('joins recruitment and returns 201', async () => {
		const res = await app.request(
			`/v1/recruitments/${recruitmentId}/participants`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': apiKey,
				},
				body: JSON.stringify({
					discordId: testUserId,
					mainRole: 'mid',
					subRole: 'top',
				}),
			},
			env,
		)

		expect(res.status).toBe(201)

		const data = (await res.json()) as {
			participant: { discordId: string; mainRole: string; subRole: string }
			count: number
			isFull: boolean
		}
		expect(data.participant.discordId).toBe(testUserId)
		expect(data.participant.mainRole).toBe('mid')
		expect(data.participant.subRole).toBe('top')
		expect(data.count).toBe(1)
		expect(data.isFull).toBe(false)
	})

	it('returns 404 for non-existent recruitment', async () => {
		const res = await app.request(
			`/v1/recruitments/${crypto.randomUUID()}/participants`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': apiKey,
				},
				body: JSON.stringify({
					discordId: testUserId,
				}),
			},
			env,
		)

		expect(res.status).toBe(404)
	})

	it('returns 400 when already joined', async () => {
		// Join first
		await app.request(
			`/v1/recruitments/${recruitmentId}/participants`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': apiKey,
				},
				body: JSON.stringify({
					discordId: testUserId,
				}),
			},
			env,
		)

		// Try to join again
		const res = await app.request(
			`/v1/recruitments/${recruitmentId}/participants`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': apiKey,
				},
				body: JSON.stringify({
					discordId: testUserId,
				}),
			},
			env,
		)

		expect(res.status).toBe(400)
	})
})
