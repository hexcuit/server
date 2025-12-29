import { beforeEach, describe, expect, it } from 'bun:test'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, type TestContext } from '@/__tests__/test-utils'
import { guildMatches, guildMatchPlayers, guilds, users } from '@/db/schema'
import { typedApp } from './create'

describe('POST /v1/guilds/:guildId/matches/:matchId/votes', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('creates a new vote', async () => {
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

		const res = await client.v1.guilds[':guildId'].matches[':matchId'].votes.$post(
			{
				param: { guildId: ctx.guildId, matchId: match.id },
				json: { discordId: player1, vote: 'BLUE' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.changed).toBe(true)
			expect(data.blueVotes).toBe(1)
			expect(data.redVotes).toBe(0)
			expect(data.drawVotes).toBe(0)
			expect(data.totalParticipants).toBe(2)
			expect(data.votesRequired).toBe(2) // ceil(2/2) + 1 = 2
		}
	})

	it('changes an existing vote', async () => {
		const db = drizzle(env.DB)
		const player1 = `player1_change_${ctx.guildId}`
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values({ discordId: player1 })

		const [match] = (await db
			.insert(guildMatches)
			.values({
				guildId: ctx.guildId,
				channelId: 'channel_123',
				messageId: `message_${ctx.guildId}`,
				status: 'voting',
			})
			.returning()) as [typeof guildMatches.$inferSelect]

		await db.insert(guildMatchPlayers).values({
			matchId: match.id,
			discordId: player1,
			team: 'BLUE',
			role: 'TOP',
			ratingBefore: 1000,
		})

		// First vote
		await client.v1.guilds[':guildId'].matches[':matchId'].votes.$post(
			{
				param: { guildId: ctx.guildId, matchId: match.id },
				json: { discordId: player1, vote: 'BLUE' },
			},
			authHeaders,
		)

		// Change vote
		const res = await client.v1.guilds[':guildId'].matches[':matchId'].votes.$post(
			{
				param: { guildId: ctx.guildId, matchId: match.id },
				json: { discordId: player1, vote: 'RED' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.changed).toBe(true)
			expect(data.blueVotes).toBe(0)
			expect(data.redVotes).toBe(1)
		}
	})

	it('returns changed=false when vote is the same', async () => {
		const db = drizzle(env.DB)
		const player1 = `player1_same_${ctx.guildId}`
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values({ discordId: player1 })

		const [match] = (await db
			.insert(guildMatches)
			.values({
				guildId: ctx.guildId,
				channelId: 'channel_123',
				messageId: `message_${ctx.guildId}`,
				status: 'voting',
			})
			.returning()) as [typeof guildMatches.$inferSelect]

		await db.insert(guildMatchPlayers).values({
			matchId: match.id,
			discordId: player1,
			team: 'BLUE',
			role: 'TOP',
			ratingBefore: 1000,
		})

		// First vote
		await client.v1.guilds[':guildId'].matches[':matchId'].votes.$post(
			{
				param: { guildId: ctx.guildId, matchId: match.id },
				json: { discordId: player1, vote: 'BLUE' },
			},
			authHeaders,
		)

		// Same vote again
		const res = await client.v1.guilds[':guildId'].matches[':matchId'].votes.$post(
			{
				param: { guildId: ctx.guildId, matchId: match.id },
				json: { discordId: player1, vote: 'BLUE' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.changed).toBe(false)
		}
	})

	it('returns 404 when match not found', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].matches[':matchId'].votes.$post(
			{
				param: { guildId: ctx.guildId, matchId: 'nonexistent' },
				json: { discordId: 'player1', vote: 'BLUE' },
			},
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Match not found')
		}
	})

	it('returns 404 when player not in match', async () => {
		const db = drizzle(env.DB)
		const outsider = `outsider_${ctx.guildId}`
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values({ discordId: outsider })

		const [match] = (await db
			.insert(guildMatches)
			.values({
				guildId: ctx.guildId,
				channelId: 'channel_123',
				messageId: `message_${ctx.guildId}`,
				status: 'voting',
			})
			.returning()) as [typeof guildMatches.$inferSelect]

		const res = await client.v1.guilds[':guildId'].matches[':matchId'].votes.$post(
			{
				param: { guildId: ctx.guildId, matchId: match.id },
				json: { discordId: outsider, vote: 'BLUE' },
			},
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Player not in match')
		}
	})

	it('returns 400 when match already confirmed', async () => {
		const db = drizzle(env.DB)
		const player1 = `player1_confirmed_${ctx.guildId}`
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values({ discordId: player1 })

		const [match] = (await db
			.insert(guildMatches)
			.values({
				guildId: ctx.guildId,
				channelId: 'channel_123',
				messageId: `message_${ctx.guildId}`,
				status: 'confirmed',
			})
			.returning()) as [typeof guildMatches.$inferSelect]

		await db.insert(guildMatchPlayers).values({
			matchId: match.id,
			discordId: player1,
			team: 'BLUE',
			role: 'TOP',
			ratingBefore: 1000,
		})

		const res = await client.v1.guilds[':guildId'].matches[':matchId'].votes.$post(
			{
				param: { guildId: ctx.guildId, matchId: match.id },
				json: { discordId: player1, vote: 'BLUE' },
			},
			authHeaders,
		)

		expect(res.status).toBe(400)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Match already confirmed')
		}
	})
})
