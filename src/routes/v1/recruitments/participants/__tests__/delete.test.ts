import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { recruitmentParticipants, recruitments } from '@/db/schema'
import { app } from '@/index'

describe('DELETE /v1/recruitments/{id}/participants/{discordId}', () => {
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
		await db.insert(recruitmentParticipants).values({
			id: crypto.randomUUID(),
			recruitmentId,
			discordId: ctx.discordId2,
			mainRole: 'adc',
			subRole: null,
		})
	})

	it('leaves recruitment and returns 200', async () => {
		const res = await app.request(
			`/v1/recruitments/${recruitmentId}/participants/${ctx.discordId2}`,
			{
				method: 'DELETE',
				headers: {
					'x-api-key': env.API_KEY,
				},
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as { count: number }
		expect(data.count).toBe(0)
	})

	it('returns 404 when not a participant', async () => {
		const res = await app.request(
			`/v1/recruitments/${recruitmentId}/participants/non-participant-${ctx.prefix}`,
			{
				method: 'DELETE',
				headers: {
					'x-api-key': env.API_KEY,
				},
			},
			env,
		)

		expect(res.status).toBe(404)
	})
})
