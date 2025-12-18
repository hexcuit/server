import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { queuePlayers, queues } from '@/db/schema'
import { app } from '@/index'

describe('DELETE /v1/queues/{id}/players/{discordId}', () => {
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
		await db.insert(queuePlayers).values({
			id: crypto.randomUUID(),
			queueId: queueId,
			discordId: ctx.discordId2,
			mainRole: 'BOTTOM',
			subRole: null,
		})
	})

	it('leaves queue and returns 200', async () => {
		const res = await app.request(
			`/v1/queues/${queueId}/players/${ctx.discordId2}`,
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

	it('returns 404 when not a player', async () => {
		const res = await app.request(
			`/v1/queues/${queueId}/players/non-player-${ctx.prefix}`,
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
