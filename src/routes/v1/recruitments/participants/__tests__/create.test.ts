import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { recruitments } from '@/db/schema'
import { app } from '@/index'

describe('POST /v1/recruitments/{id}/participants', () => {
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

	it('joins recruitment and returns 201', async () => {
		const res = await app.request(
			`/v1/recruitments/${recruitmentId}/participants`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': env.API_KEY,
				},
				body: JSON.stringify({
					discordId: ctx.discordId2,
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
		expect(data.participant.discordId).toBe(ctx.discordId2)
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
			`/v1/recruitments/${recruitmentId}/participants`,
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
			`/v1/recruitments/${recruitmentId}/participants`,
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
