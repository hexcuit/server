import { beforeEach, describe, expect, it } from 'bun:test'
import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { env } from '@test/setup'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { guildMatches, guildMatchPlayers, guildMatchVotes, guilds, guildUserStats, users } from '@/db/schema'
import { typedApp } from './confirm'

describe('POST /v1/guilds/:guildId/matches/:matchId/confirm', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('confirms a match with blue win', async () => {
		const db = drizzle(env.DB)
		const player1 = `player1_${ctx.guildId}`
		const player2 = `player2_${ctx.guildId}`
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values([{ discordId: player1 }, { discordId: player2 }])
		await db.insert(guildUserStats).values([
			{ guildId: ctx.guildId, discordId: player1, rating: 1000, peakRating: 1000 },
			{ guildId: ctx.guildId, discordId: player2, rating: 1000, peakRating: 1000 },
		])

		const [match] = (await db
			.insert(guildMatches)
			.values({
				guildId: ctx.guildId,
				channelId: 'channel_123',
				messageId: `message_${ctx.guildId}`,
				status: 'voting',
				blueVotes: 2,
				redVotes: 0,
				drawVotes: 0,
			})
			.returning()) as [typeof guildMatches.$inferSelect]

		await db.insert(guildMatchPlayers).values([
			{ matchId: match.id, discordId: player1, team: 'BLUE', role: 'TOP', ratingBefore: 1000 },
			{ matchId: match.id, discordId: player2, team: 'RED', role: 'TOP', ratingBefore: 1000 },
		])

		await db.insert(guildMatchVotes).values([
			{ matchId: match.id, discordId: player1, vote: 'BLUE' },
			{ matchId: match.id, discordId: player2, vote: 'BLUE' },
		])

		const res = await client.v1.guilds[':guildId'].matches[':matchId'].confirm.$post(
			{
				param: { guildId: ctx.guildId, matchId: match.id },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.confirmed).toBe(true)
			expect(data.winningTeam).toBe('BLUE')
			expect(data.ratingChanges).toHaveLength(2)

			// Check player1 (winner) rating change - placement games use K_FACTOR_PLACEMENT (64)
			const player1Change = data.ratingChanges.find((r) => r.discordId === player1)
			expect(player1Change?.ratingChange).toBe(32) // K_FACTOR_PLACEMENT / 2

			// Check player2 (loser) rating change
			const player2Change = data.ratingChanges.find((r) => r.discordId === player2)
			expect(player2Change?.ratingChange).toBe(-32)
		}

		// Verify stats were updated
		const player1Stats = await db
			.select()
			.from(guildUserStats)
			.where(and(eq(guildUserStats.guildId, ctx.guildId), eq(guildUserStats.discordId, player1)))
			.get()
		expect(player1Stats?.wins).toBe(1)
		expect(player1Stats?.rating).toBe(1032)
		expect(player1Stats?.placementGames).toBe(1)

		const player2Stats = await db
			.select()
			.from(guildUserStats)
			.where(and(eq(guildUserStats.guildId, ctx.guildId), eq(guildUserStats.discordId, player2)))
			.get()
		expect(player2Stats?.losses).toBe(1)
		expect(player2Stats?.rating).toBe(968)
		expect(player2Stats?.placementGames).toBe(1)
	})

	it('confirms a match with red win', async () => {
		const db = drizzle(env.DB)
		const player1 = `player1_red_${ctx.guildId}`
		const player2 = `player2_red_${ctx.guildId}`
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values([{ discordId: player1 }, { discordId: player2 }])
		await db.insert(guildUserStats).values([
			{ guildId: ctx.guildId, discordId: player1, rating: 1000, peakRating: 1000 },
			{ guildId: ctx.guildId, discordId: player2, rating: 1000, peakRating: 1000 },
		])

		const [match] = (await db
			.insert(guildMatches)
			.values({
				guildId: ctx.guildId,
				channelId: 'channel_123',
				messageId: `message_${ctx.guildId}`,
				status: 'voting',
				blueVotes: 0,
				redVotes: 2,
				drawVotes: 0,
			})
			.returning()) as [typeof guildMatches.$inferSelect]

		await db.insert(guildMatchPlayers).values([
			{ matchId: match.id, discordId: player1, team: 'BLUE', role: 'TOP', ratingBefore: 1000 },
			{ matchId: match.id, discordId: player2, team: 'RED', role: 'TOP', ratingBefore: 1000 },
		])

		const res = await client.v1.guilds[':guildId'].matches[':matchId'].confirm.$post(
			{
				param: { guildId: ctx.guildId, matchId: match.id },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.confirmed).toBe(true)
			expect(data.winningTeam).toBe('RED')
		}
	})

	it('confirms a match with draw', async () => {
		const db = drizzle(env.DB)
		const player1 = `player1_draw_${ctx.guildId}`
		const player2 = `player2_draw_${ctx.guildId}`
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values([{ discordId: player1 }, { discordId: player2 }])
		await db.insert(guildUserStats).values([
			{ guildId: ctx.guildId, discordId: player1, rating: 1000, peakRating: 1000 },
			{ guildId: ctx.guildId, discordId: player2, rating: 1000, peakRating: 1000 },
		])

		const [match] = (await db
			.insert(guildMatches)
			.values({
				guildId: ctx.guildId,
				channelId: 'channel_123',
				messageId: `message_${ctx.guildId}`,
				status: 'voting',
				blueVotes: 0,
				redVotes: 0,
				drawVotes: 2,
			})
			.returning()) as [typeof guildMatches.$inferSelect]

		await db.insert(guildMatchPlayers).values([
			{ matchId: match.id, discordId: player1, team: 'BLUE', role: 'TOP', ratingBefore: 1000 },
			{ matchId: match.id, discordId: player2, team: 'RED', role: 'TOP', ratingBefore: 1000 },
		])

		const res = await client.v1.guilds[':guildId'].matches[':matchId'].confirm.$post(
			{
				param: { guildId: ctx.guildId, matchId: match.id },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.winningTeam).toBe('DRAW')
			expect(data.ratingChanges.every((r) => r.ratingChange === 0)).toBe(true)
		}
	})

	it('returns 404 when match not found', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].matches[':matchId'].confirm.$post(
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

	it('returns 400 when match already confirmed', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const [match] = (await db
			.insert(guildMatches)
			.values({
				guildId: ctx.guildId,
				channelId: 'channel_123',
				messageId: `message_${ctx.guildId}`,
				status: 'confirmed',
			})
			.returning()) as [typeof guildMatches.$inferSelect]

		const res = await client.v1.guilds[':guildId'].matches[':matchId'].confirm.$post(
			{
				param: { guildId: ctx.guildId, matchId: match.id },
			},
			authHeaders,
		)

		expect(res.status).toBe(400)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Match already confirmed')
		}
	})

	it('returns 400 when no majority vote', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const [match] = (await db
			.insert(guildMatches)
			.values({
				guildId: ctx.guildId,
				channelId: 'channel_123',
				messageId: `message_${ctx.guildId}`,
				status: 'voting',
				blueVotes: 1,
				redVotes: 1,
				drawVotes: 0,
			})
			.returning()) as [typeof guildMatches.$inferSelect]

		const res = await client.v1.guilds[':guildId'].matches[':matchId'].confirm.$post(
			{
				param: { guildId: ctx.guildId, matchId: match.id },
			},
			authHeaders,
		)

		expect(res.status).toBe(400)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('No majority vote')
		}
	})
})
