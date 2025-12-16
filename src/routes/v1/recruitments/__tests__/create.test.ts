import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'
import { recruitments, users } from '@/db/schema'
import { app } from '@/index'

describe('POST /v1/recruitments', () => {
	const apiKey = 'test-api-key'
	const recruitmentId = crypto.randomUUID()
	const testGuildId = 'test-guild-123'
	const testChannelId = 'test-channel-123'
	const testMessageId = 'test-message-123'
	const testCreatorId = 'test-creator-123'

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
		await db.delete(recruitments).where(eq(recruitments.id, recruitmentId))
		await db.delete(users).where(eq(users.discordId, testCreatorId))
	})

	it('creates a new recruitment and returns 201', async () => {
		const res = await app.request(
			'/v1/recruitments',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': apiKey,
				},
				body: JSON.stringify({
					id: recruitmentId,
					guildId: testGuildId,
					channelId: testChannelId,
					messageId: testMessageId,
					creatorId: testCreatorId,
					type: 'normal',
					anonymous: false,
				}),
			},
			env,
		)

		expect(res.status).toBe(201)

		const data = (await res.json()) as { recruitment: { id: string } }
		expect(data.recruitment.id).toBe(recruitmentId)

		const db = drizzle(env.DB)
		const saved = await db.select().from(recruitments).where(eq(recruitments.id, recruitmentId)).get()

		expect(saved).toBeDefined()
		expect(saved?.guildId).toBe(testGuildId)
		expect(saved?.status).toBe('open')
	})

	it('returns 401 without API key', async () => {
		const res = await app.request(
			'/v1/recruitments',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					id: recruitmentId,
					guildId: testGuildId,
					channelId: testChannelId,
					messageId: testMessageId,
					creatorId: testCreatorId,
					type: 'normal',
					anonymous: false,
				}),
			},
			env,
		)

		expect(res.status).toBe(401)
	})
})
