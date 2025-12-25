import { beforeEach, describe, expect, it } from 'bun:test'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { guildMatches, guildMatchPlayers, guildUserStats } from '@/db/schema'
import { typedApp } from './reset-stats'

describe('resetUserStats', () => {
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

	it('deletes user stats and match players', async () => {
		const db = drizzle(env.DB)
		const matchId = ctx.generateMatchId()

		// Create a match with both users
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

		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.$delete(
			{ param: { guildId: ctx.guildId, discordId: ctx.discordId } },
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.deleted).toBe(true)
			expect(data.deletedCounts.userStats).toBe(1)
			expect(data.deletedCounts.matchPlayers).toBe(1)
		}

		// Verify user stats are deleted
		const remainingStats = await db
			.select()
			.from(guildUserStats)
			.where(and(eq(guildUserStats.guildId, ctx.guildId), eq(guildUserStats.discordId, ctx.discordId)))
		expect(remainingStats).toHaveLength(0)

		// Verify match players are deleted for this user
		const remainingPlayers = await db
			.select()
			.from(guildMatchPlayers)
			.where(eq(guildMatchPlayers.discordId, ctx.discordId))
		expect(remainingPlayers).toHaveLength(0)
	})

	it('does not affect other users stats', async () => {
		const db = drizzle(env.DB)
		const matchId = ctx.generateMatchId()

		// Create a match with both users
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

		await client.v1.guilds[':guildId'].users[':discordId'].stats.$delete(
			{ param: { guildId: ctx.guildId, discordId: ctx.discordId } },
			authHeaders,
		)

		// Verify other user's stats still exist
		const otherStats = await db
			.select()
			.from(guildUserStats)
			.where(and(eq(guildUserStats.guildId, ctx.guildId), eq(guildUserStats.discordId, ctx.discordId2)))
		expect(otherStats).toHaveLength(1)

		// Verify other user's match players still exist
		const otherPlayers = await db
			.select()
			.from(guildMatchPlayers)
			.where(eq(guildMatchPlayers.discordId, ctx.discordId2))
		expect(otherPlayers).toHaveLength(1)
	})

	it('does not delete match itself', async () => {
		const db = drizzle(env.DB)
		const matchId = ctx.generateMatchId()

		// Create a match
		await db.insert(guildMatches).values({
			id: matchId,
			guildId: ctx.guildId,
			winningTeam: 'BLUE',
		})
		await db.insert(guildMatchPlayers).values({
			matchId,
			discordId: ctx.discordId,
			team: 'BLUE',
			role: 'TOP',
			ratingBefore: 1200,
			ratingAfter: 1225,
		})

		await client.v1.guilds[':guildId'].users[':discordId'].stats.$delete(
			{ param: { guildId: ctx.guildId, discordId: ctx.discordId } },
			authHeaders,
		)

		// Verify match still exists
		const remainingMatches = await db.select().from(guildMatches).where(eq(guildMatches.id, matchId))
		expect(remainingMatches).toHaveLength(1)
	})

	it('returns 404 for non-existent user', async () => {
		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.$delete(
			{ param: { guildId: ctx.guildId, discordId: 'non-existent-user' } },
			authHeaders,
		)

		expect(res.status).toBe(404)
	})

	it('succeeds when user has no match history', async () => {
		// User has stats but no match history
		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.$delete(
			{ param: { guildId: ctx.guildId, discordId: ctx.discordId } },
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.deleted).toBe(true)
			expect(data.deletedCounts.userStats).toBe(1)
			expect(data.deletedCounts.matchPlayers).toBe(0)
		}
	})

	it('only deletes match players from specified guild', async () => {
		const db = drizzle(env.DB)
		const otherGuildId = `other-guild-${ctx.prefix}`
		const matchId1 = ctx.generateMatchId()
		const matchId2 = ctx.generateMatchId()

		// Create match in test guild
		await db.insert(guildMatches).values({
			id: matchId1,
			guildId: ctx.guildId,
			winningTeam: 'BLUE',
		})
		await db.insert(guildMatchPlayers).values({
			matchId: matchId1,
			discordId: ctx.discordId,
			team: 'BLUE',
			role: 'TOP',
			ratingBefore: 1200,
			ratingAfter: 1225,
		})

		// Create match in other guild
		await db.insert(guildMatches).values({
			id: matchId2,
			guildId: otherGuildId,
			winningTeam: 'BLUE',
		})
		await db.insert(guildMatchPlayers).values({
			matchId: matchId2,
			discordId: ctx.discordId,
			team: 'BLUE',
			role: 'TOP',
			ratingBefore: 1300,
			ratingAfter: 1325,
		})

		// Also add stats for other guild
		await db.insert(guildUserStats).values({
			guildId: otherGuildId,
			discordId: ctx.discordId,
			rating: 1300,
			wins: 1,
			losses: 0,
			placementGames: 1,
		})

		await client.v1.guilds[':guildId'].users[':discordId'].stats.$delete(
			{ param: { guildId: ctx.guildId, discordId: ctx.discordId } },
			authHeaders,
		)

		// Verify other guild's match players still exist
		const otherGuildPlayers = await db.select().from(guildMatchPlayers).where(eq(guildMatchPlayers.matchId, matchId2))
		expect(otherGuildPlayers).toHaveLength(1)

		// Verify other guild's stats still exist
		const otherGuildStats = await db.select().from(guildUserStats).where(eq(guildUserStats.guildId, otherGuildId))
		expect(otherGuildStats).toHaveLength(1)
	})
})
