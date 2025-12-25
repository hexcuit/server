import { beforeEach, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import {
	guildMatches,
	guildMatchPlayers,
	guildMatchVotes,
	guildPendingMatches,
	guilds,
	guildUserStats,
} from '@/db/schema'
import { typedApp } from './reset'

describe('resetGuildStats', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(async () => {
		ctx = createTestContext()
		const db = drizzle(env.DB)
		await setupTestUsers(db, ctx, { withRatings: true })
		// Also create stats for second user
		await db.insert(guildUserStats).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId2,
			rating: 1500,
			wins: 0,
			losses: 0,
			placementGames: 0,
		})
	})

	it('deletes all stats, matches, and match players for a guild', async () => {
		const db = drizzle(env.DB)
		const matchId = ctx.generateMatchId()

		// Create a confirmed match
		await db.insert(guildMatches).values({
			id: matchId,
			guildId: ctx.guildId,
			winningTeam: 'BLUE',
		})
		await db.insert(guildMatchPlayers).values([
			{
				matchId,
				discordId: ctx.discordId,
				team: 'BLUE',
				role: 'TOP',
				ratingBefore: 1200,
				ratingAfter: 1225,
			},
			{
				matchId,
				discordId: ctx.discordId2,
				team: 'RED',
				role: 'JUNGLE',
				ratingBefore: 1200,
				ratingAfter: 1175,
			},
		])

		const res = await client.v1.guilds[':guildId'].stats.$delete({ param: { guildId: ctx.guildId } }, authHeaders)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.deleted).toBe(true)
			expect(data.deletedCounts.userStats).toBe(2)
			expect(data.deletedCounts.matches).toBe(1)
			expect(data.deletedCounts.matchPlayers).toBe(2)
		}

		// Verify data is actually deleted
		const remainingStats = await db.select().from(guildUserStats).where(eq(guildUserStats.guildId, ctx.guildId))
		expect(remainingStats).toHaveLength(0)

		const remainingMatches = await db.select().from(guildMatches).where(eq(guildMatches.guildId, ctx.guildId))
		expect(remainingMatches).toHaveLength(0)
	})

	it('deletes pending matches and votes', async () => {
		const db = drizzle(env.DB)
		const pendingMatchId = ctx.generateMatchId()

		// Create a pending match with votes
		await db.insert(guildPendingMatches).values({
			id: pendingMatchId,
			guildId: ctx.guildId,
			channelId: 'test-channel',
			messageId: 'test-message',
			status: 'voting',
			teamAssignments: JSON.stringify({}),
			blueVotes: 1,
			redVotes: 0,
			drawVotes: 0,
		})
		await db.insert(guildMatchVotes).values({
			pendingMatchId,
			discordId: ctx.discordId,
			vote: 'BLUE',
		})

		const res = await client.v1.guilds[':guildId'].stats.$delete({ param: { guildId: ctx.guildId } }, authHeaders)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.deleted).toBe(true)
			expect(data.deletedCounts.pendingMatches).toBe(1)
		}

		// Verify pending matches are deleted
		const remainingPending = await db
			.select()
			.from(guildPendingMatches)
			.where(eq(guildPendingMatches.guildId, ctx.guildId))
		expect(remainingPending).toHaveLength(0)
	})

	it('returns zero counts for empty guild', async () => {
		const emptyGuildId = `empty-guild-${ctx.prefix}`

		const res = await client.v1.guilds[':guildId'].stats.$delete({ param: { guildId: emptyGuildId } }, authHeaders)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.deleted).toBe(true)
			expect(data.deletedCounts.userStats).toBe(0)
			expect(data.deletedCounts.matches).toBe(0)
			expect(data.deletedCounts.matchPlayers).toBe(0)
			expect(data.deletedCounts.pendingMatches).toBe(0)
		}
	})

	it('does not affect other guilds', async () => {
		const db = drizzle(env.DB)
		const otherGuildId = `other-guild-${ctx.prefix}`

		// Setup other guild with stats
		await db.insert(guilds).values({ guildId: otherGuildId })
		await db.insert(guildUserStats).values({
			guildId: otherGuildId,
			discordId: ctx.discordId,
			rating: 1200,
			wins: 0,
			losses: 0,
			placementGames: 0,
		})

		const res = await client.v1.guilds[':guildId'].stats.$delete({ param: { guildId: ctx.guildId } }, authHeaders)

		expect(res.status).toBe(200)

		// Verify other guild stats still exist
		const otherStats = await db.select().from(guildUserStats).where(eq(guildUserStats.guildId, otherGuildId))
		expect(otherStats).toHaveLength(1)
	})
})
