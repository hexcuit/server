import { env } from 'cloudflare:test'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { recruitments } from '@/db/schema'
import { app } from '@/index'

describe('DELETE /v1/recruitments/{id}', () => {
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

	it('deletes recruitment and returns 200', async () => {
		const res = await app.request(
			`/v1/recruitments/${recruitmentId}`,
			{
				method: 'DELETE',
				headers: {
					'x-api-key': env.API_KEY,
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
