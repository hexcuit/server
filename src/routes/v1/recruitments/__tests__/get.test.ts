import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { recruitments } from '@/db/schema'
import { app } from '@/index'

describe('GET /v1/recruitments/{id}', () => {
	let ctx: TestContext
	let recruitmentId: string

	beforeEach(async () => {
		ctx = createTestContext()
		recruitmentId = ctx.generateRecruitmentId()
		const db = drizzle(env.DB)
		await setupTestUsers(db, ctx)

		await db.insert(recruitments).values({
			id: recruitmentId,
			guildId: ctx.guildId,
			channelId: ctx.channelId,
			messageId: ctx.messageId,
			creatorId: ctx.discordId,
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
					'x-api-key': env.API_KEY,
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
					'x-api-key': env.API_KEY,
				},
			},
			env,
		)

		expect(res.status).toBe(404)
	})
})
