import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'
import { recruitments, users } from '@/db/schema'
import { app } from '@/index'

describe('GET /v1/recruitments/{id}', () => {
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

	it('returns recruitment with participants', async () => {
		const res = await app.request(
			`/v1/recruitments/${recruitmentId}`,
			{
				method: 'GET',
				headers: {
					'x-api-key': apiKey,
				},
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as {
			recruitment: { id: string }
			participants: unknown[]
			count: number
		}
		expect(data.recruitment.id).toBe(recruitmentId)
		expect(data.participants).toEqual([])
		expect(data.count).toBe(0)
	})

	it('returns 404 for non-existent recruitment', async () => {
		const res = await app.request(
			`/v1/recruitments/${crypto.randomUUID()}`,
			{
				method: 'GET',
				headers: {
					'x-api-key': apiKey,
				},
			},
			env,
		)

		expect(res.status).toBe(404)
	})
})
