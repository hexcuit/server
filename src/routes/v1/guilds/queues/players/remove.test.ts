import { beforeEach, describe, expect, it } from 'bun:test'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { guildQueuePlayers, guildQueues } from '@/db/schema'
import { typedApp } from './remove'

describe('removeQueuePlayer', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext
	let queueId: string

	beforeEach(async () => {
		ctx = createTestContext()
		queueId = ctx.generateQueueId()
		const db = drizzle(env.DB)
		await setupTestUsers(db, ctx)

		await db.insert(guildQueues).values({
			id: queueId,
			guildId: ctx.guildId,
			channelId: ctx.channelId,
			messageId: ctx.messageId,
			creatorId: ctx.discordId,
			type: 'normal',
			anonymous: false,
			capacity: 10,
			status: 'open',
		})
		await db.insert(guildQueuePlayers).values({
			id: crypto.randomUUID(),
			queueId: queueId,
			discordId: ctx.discordId2,
			mainRole: 'BOTTOM',
			subRole: null,
		})
	})

	it('leaves queue and returns 200', async () => {
		const res = await client.v1.guilds[':guildId'].queues[':id'].players[':discordId'].$delete(
			{ param: { guildId: ctx.guildId, id: queueId, discordId: ctx.discordId2 } },
			authHeaders,
		)

		expect(res.ok).toBe(true)
		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.count).toBe(0)
		}
	})

	it('returns 404 when not a player', async () => {
		const res = await client.v1.guilds[':guildId'].queues[':id'].players[':discordId'].$delete(
			{ param: { guildId: ctx.guildId, id: queueId, discordId: `non-player-${ctx.prefix}` } },
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
