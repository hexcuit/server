import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { recruitmentParticipants, recruitments } from '@/db/schema'
import { app } from '@/index'

describe('PATCH /v1/recruitments/{id}/participants/{discordId}', () => {
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

	it('updates role and returns 200', async () => {
		const res = await app.request(
			`/v1/recruitments/${recruitmentId}/participants/${ctx.discordId2}`,
			{
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': env.API_KEY,
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
			`/v1/recruitments/${recruitmentId}/participants/non-participant-${ctx.prefix}`,
			{
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': env.API_KEY,
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
