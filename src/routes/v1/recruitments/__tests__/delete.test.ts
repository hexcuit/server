import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'
import { recruitments, users } from '@/db/schema'
import { app } from '@/index'

describe('DELETE /v1/recruitments/{id}', () => {
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

	it('deletes recruitment and returns 200', async () => {
		const res = await app.request(
			`/v1/recruitments/${recruitmentId}`,
			{
				method: 'DELETE',
				headers: {
					'x-api-key': apiKey,
				},
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as { deleted: boolean }
		expect(data.deleted).toBe(true)

		const db = drizzle(env.DB)
		const deleted = await db.select().from(recruitments).where(eq(recruitments.id, recruitmentId)).get()
		expect(deleted).toBeUndefined()
	})
})
