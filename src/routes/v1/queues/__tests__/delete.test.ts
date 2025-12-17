import { env } from 'cloudflare:test'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { queues } from '@/db/schema'
import { app } from '@/index'

describe('DELETE /v1/queues/{id}', () => {
	let ctx: TestContext
	let queueId: string

	beforeEach(async () => {
		ctx = createTestContext()
		queueId = ctx.generateQueueId()
		const db = drizzle(env.DB)
		await setupTestUsers(db, ctx)

		await db.insert(queues).values({
			id: queueId,
			guildId: ctx.guildId,
			channelId: ctx.channelId,
			messageId: ctx.messageId,
			creatorId: ctx.discordId,
			type: 'normal',
			anonymous: false,
			status: 'open',
		})
	})

	it('deletes queue and returns 200', async () => {
		const res = await app.request(
			`/v1/queues/${queueId}`,
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
		const deleted = await db.select().from(queues).where(eq(queues.id, queueId)).get()
		expect(deleted).toBeUndefined()
	})
})
