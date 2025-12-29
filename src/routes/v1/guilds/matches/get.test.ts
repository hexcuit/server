import { beforeEach, describe, expect, it } from 'bun:test'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, type TestContext } from '@/__tests__/test-utils'
import { guildMatches, guildMatchPlayers, guilds, users } from '@/db/schema'
import { typedApp } from './get'

describe('GET /v1/guilds/:guildId/matches/:matchId', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('gets a match with players and votes', async () => {
		const db = drizzle(env.DB)
		const player1 = `player1_${ctx.guildId}`
		const player2 = `player2_${ctx.guildId}`
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values([{ discordId: player1 }, { discordId: player2 }])

		const [match] = (await db
			.insert(guildMatches)
			.values({
				guildId: ctx.guildId,
				channelId: 'channel_123',
				messageId: `message_${ctx.guildId}`,
				status: 'voting',
			})
			.returning()) as [typeof guildMatches.$inferSelect]

		await db.insert(guildMatchPlayers).values([
			{ matchId: match.id, discordId: player1, team: 'BLUE', role: 'TOP', ratingBefore: 1000 },
			{ matchId: match.id, discordId: player2, team: 'RED', role: 'TOP', ratingBefore: 1000 },
		])

		const res = await client.v1.guilds[':guildId'].matches[':matchId'].$get(
			{
				param: { guildId: ctx.guildId, matchId: match.id },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.id).toBe(match.id)
			expect(data.status).toBe('voting')
			expect(data.players).toHaveLength(2)
			expect(data.votes).toHaveLength(0)
		}
	})

	it('returns 404 when guild not found', async () => {
		const res = await client.v1.guilds[':guildId'].matches[':matchId'].$get(
			{
				param: { guildId: 'nonexistent', matchId: 'match_123' },
			},
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Guild not found')
		}
	})

	it('returns 404 when match not found', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].matches[':matchId'].$get(
			{
				param: { guildId: ctx.guildId, matchId: 'nonexistent' },
			},
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Match not found')
		}
	})
})
