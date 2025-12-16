import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'
import { recruitmentParticipants, recruitments, users } from '@/db/schema'
import { app } from '@/index'

describe('PATCH /v1/recruitments/{id}/participants/{discordId}', () => {
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
		await db.insert(users).values({ discordId: testUserId })
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
		await db.insert(recruitmentParticipants).values({
			id: crypto.randomUUID(),
			recruitmentId,
			discordId: testUserId,
			mainRole: 'adc',
			subRole: null,
		})
	})

	it('updates role and returns 200', async () => {
		const res = await app.request(
			`/v1/recruitments/${recruitmentId}/participants/${testUserId}`,
			{
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': apiKey,
				},
				body: JSON.stringify({
					mainRole: 'mid',
					subRole: 'jungle',
				}),
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as {
			participant: { discordId: string; mainRole: string; subRole: string }
		}
		expect(data.participant.mainRole).toBe('mid')
		expect(data.participant.subRole).toBe('jungle')
	})

	it('returns 404 when not a participant', async () => {
		const res = await app.request(
			`/v1/recruitments/${recruitmentId}/participants/non-participant`,
			{
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': apiKey,
				},
				body: JSON.stringify({
					mainRole: 'mid',
				}),
			},
			env,
		)

		expect(res.status).toBe(404)
	})
})
