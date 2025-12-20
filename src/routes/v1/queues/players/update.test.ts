import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { authHeaders, createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { queuePlayers, queues } from '@/db/schema'
import { typedApp } from '@/routes/v1/queues/players/update'

describe('updateQueuePlayer', () => {
	const client = testClient(typedApp, env)
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

	it('updates role and returns 200', async () => {
		const res = await client.v1.queues[':id'].players[':discordId'].$patch(
			{
				param: { id: queueId, discordId: ctx.discordId2 },
				json: { mainRole: 'MIDDLE', subRole: 'JUNGLE' },
			},
			authHeaders,
		)

		expect(res.ok).toBe(true)
		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.player.mainRole).toBe('MIDDLE')
			expect(data.player.subRole).toBe('JUNGLE')
		}
	})

	it('returns 404 when not a player', async () => {
		const res = await client.v1.queues[':id'].players[':discordId'].$patch(
			{
				param: { id: queueId, discordId: `non-player-${ctx.prefix}` },
				json: { mainRole: 'MIDDLE' },
			},
			authHeaders,
		)

		expect(res.ok).toBe(false)
		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Player not found')
		}
	})
})
