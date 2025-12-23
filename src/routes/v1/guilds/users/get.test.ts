import { beforeEach, describe, expect, it } from 'bun:test'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { guildMatches, guildMatchParticipants, guilds } from '@/db/schema'
import { typedApp } from './get'

describe('getUser', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(async () => {
		ctx = createTestContext()
		const db = drizzle(env.DB)
		await setupTestUsers(db, ctx, { withRatings: true })
	})

	it('returns match history for a user', async () => {
		const db = drizzle(env.DB)
		const matchId1 = ctx.generateMatchId()
		const matchId2 = ctx.generateMatchId()
		const matchId3 = ctx.generateMatchId()

		const now = new Date()
		const match1Time = new Date(now.getTime() - 3000).toISOString()
		const match2Time = new Date(now.getTime() - 2000).toISOString()
		const match3Time = new Date(now.getTime() - 1000).toISOString()

		// Match 1: User on blue team (won)
		await db.insert(guildMatches).values({
			id: matchId1,
			guildId: ctx.guildId,
			winningTeam: 'BLUE',
			createdAt: match1Time,
		})
		await db.insert(guildMatchParticipants).values({
			id: crypto.randomUUID(),
			matchId: matchId1,
			discordId: ctx.discordId,
			team: 'BLUE',
			role: 'TOP',
			ratingBefore: 1500,
			ratingAfter: 1525,
		})

		// Match 2: User on red team (lost)
		await db.insert(guildMatches).values({
			id: matchId2,
			guildId: ctx.guildId,
			winningTeam: 'BLUE',
			createdAt: match2Time,
		})
		await db.insert(guildMatchParticipants).values({
			id: crypto.randomUUID(),
			matchId: matchId2,
			discordId: ctx.discordId,
			team: 'RED',
			role: 'JUNGLE',
			ratingBefore: 1525,
			ratingAfter: 1510,
		})

		// Match 3: User on blue team (won)
		await db.insert(guildMatches).values({
			id: matchId3,
			guildId: ctx.guildId,
			winningTeam: 'BLUE',
			createdAt: match3Time,
		})
		await db.insert(guildMatchParticipants).values({
			id: crypto.randomUUID(),
			matchId: matchId3,
			discordId: ctx.discordId,
			team: 'BLUE',
			role: 'MIDDLE',
			ratingBefore: 1510,
			ratingAfter: 1535,
		})

		const res = await client.v1.guilds[':guildId'].users[':discordId'].$get(
			{ param: { guildId: ctx.guildId, discordId: ctx.discordId }, query: {} },
			authHeaders,
		)

		expect(res.status).toBe(200)

		const data = await res.json()

		expect(data.guildId).toBe(ctx.guildId)
		expect(data.discordId).toBe(ctx.discordId)
		expect(data.history).toHaveLength(3)

		// Verify matches are ordered by createdAt (most recent first)
		expect(data.history[0]?.matchId).toBe(matchId3)
		expect(data.history[1]?.matchId).toBe(matchId2)
		expect(data.history[2]?.matchId).toBe(matchId1)

		// Verify match 3 details (most recent)
		expect(data.history[0]?.team).toBe('BLUE')
		expect(data.history[0]?.role).toBe('MIDDLE')
		expect(data.history[0]?.ratingBefore).toBe(1510)
		expect(data.history[0]?.ratingAfter).toBe(1535)
		expect(data.history[0]?.change).toBe(25)
		expect(data.history[0]?.won).toBe(true)

		// Verify match 2 details (lost)
		expect(data.history[1]?.team).toBe('RED')
		expect(data.history[1]?.role).toBe('JUNGLE')
		expect(data.history[1]?.ratingBefore).toBe(1525)
		expect(data.history[1]?.ratingAfter).toBe(1510)
		expect(data.history[1]?.change).toBe(-15)
		expect(data.history[1]?.won).toBe(false)

		// Verify match 1 details (won)
		expect(data.history[2]?.team).toBe('BLUE')
		expect(data.history[2]?.role).toBe('TOP')
		expect(data.history[2]?.ratingBefore).toBe(1500)
		expect(data.history[2]?.ratingAfter).toBe(1525)
		expect(data.history[2]?.change).toBe(25)
		expect(data.history[2]?.won).toBe(true)
	})

	it('respects the limit query parameter', async () => {
		const db = drizzle(env.DB)

		const now = new Date()
		for (let i = 0; i < 3; i++) {
			const matchId = ctx.generateMatchId()
			const matchTime = new Date(now.getTime() - (3 - i) * 1000).toISOString()

			await db.insert(guildMatches).values({
				id: matchId,
				guildId: ctx.guildId,
				winningTeam: 'BLUE',
				createdAt: matchTime,
			})
			await db.insert(guildMatchParticipants).values({
				id: crypto.randomUUID(),
				matchId,
				discordId: ctx.discordId,
				team: 'BLUE',
				role: 'TOP',
				ratingBefore: 1500,
				ratingAfter: 1525,
			})
		}

		const res = await client.v1.guilds[':guildId'].users[':discordId'].$get(
			{
				param: { guildId: ctx.guildId, discordId: ctx.discordId },
				query: { limit: '2' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		const data = await res.json()
		expect(data.history).toHaveLength(2)
	})

	it('returns default limit of 5 matches when limit is not specified', async () => {
		const db = drizzle(env.DB)

		const now = new Date()
		for (let i = 0; i < 7; i++) {
			const matchId = ctx.generateMatchId()
			const matchTime = new Date(now.getTime() - (7 - i) * 1000).toISOString()

			await db.insert(guildMatches).values({
				id: matchId,
				guildId: ctx.guildId,
				winningTeam: 'BLUE',
				createdAt: matchTime,
			})
			await db.insert(guildMatchParticipants).values({
				id: crypto.randomUUID(),
				matchId,
				discordId: ctx.discordId,
				team: 'BLUE',
				role: 'TOP',
				ratingBefore: 1500,
				ratingAfter: 1525,
			})
		}

		const res = await client.v1.guilds[':guildId'].users[':discordId'].$get(
			{ param: { guildId: ctx.guildId, discordId: ctx.discordId }, query: {} },
			authHeaders,
		)

		expect(res.status).toBe(200)

		const data = await res.json()
		expect(data.history).toHaveLength(5)
	})

	it('returns empty history for user with no matches', async () => {
		const res = await client.v1.guilds[':guildId'].users[':discordId'].$get(
			{ param: { guildId: ctx.guildId, discordId: ctx.discordId }, query: {} },
			authHeaders,
		)

		expect(res.status).toBe(200)

		const data = await res.json()

		expect(data.guildId).toBe(ctx.guildId)
		expect(data.discordId).toBe(ctx.discordId)
		expect(data.history).toHaveLength(0)
	})

	it('only returns matches for the specified guild', async () => {
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
		await db.insert(guildMatchParticipants).values({
			id: crypto.randomUUID(),
			matchId: matchId1,
			discordId: ctx.discordId,
			team: 'BLUE',
			role: 'TOP',
			ratingBefore: 1500,
			ratingAfter: 1525,
		})

		// Create match in other guild
		await db.insert(guilds).values({ guildId: otherGuildId }).onConflictDoNothing()
		await db.insert(guildMatches).values({
			id: matchId2,
			guildId: otherGuildId,
			winningTeam: 'BLUE',
		})
		await db.insert(guildMatchParticipants).values({
			id: crypto.randomUUID(),
			matchId: matchId2,
			discordId: ctx.discordId,
			team: 'BLUE',
			role: 'TOP',
			ratingBefore: 1500,
			ratingAfter: 1525,
		})

		const res = await client.v1.guilds[':guildId'].users[':discordId'].$get(
			{ param: { guildId: ctx.guildId, discordId: ctx.discordId }, query: {} },
			authHeaders,
		)

		expect(res.status).toBe(200)

		const data = await res.json()
		expect(data.history).toHaveLength(1)
		expect(data.history[0]?.matchId).toBe(matchId1)
	})

	it('only returns matches for the specified user', async () => {
		const db = drizzle(env.DB)
		const matchId1 = ctx.generateMatchId()
		const matchId2 = ctx.generateMatchId()

		// Create match with ctx.discordId
		await db.insert(guildMatches).values({
			id: matchId1,
			guildId: ctx.guildId,
			winningTeam: 'BLUE',
		})
		await db.insert(guildMatchParticipants).values({
			id: crypto.randomUUID(),
			matchId: matchId1,
			discordId: ctx.discordId,
			team: 'BLUE',
			role: 'TOP',
			ratingBefore: 1500,
			ratingAfter: 1525,
		})

		// Create match with ctx.discordId2
		await db.insert(guildMatches).values({
			id: matchId2,
			guildId: ctx.guildId,
			winningTeam: 'BLUE',
		})
		await db.insert(guildMatchParticipants).values({
			id: crypto.randomUUID(),
			matchId: matchId2,
			discordId: ctx.discordId2,
			team: 'BLUE',
			role: 'TOP',
			ratingBefore: 1500,
			ratingAfter: 1525,
		})

		const res = await client.v1.guilds[':guildId'].users[':discordId'].$get(
			{ param: { guildId: ctx.guildId, discordId: ctx.discordId }, query: {} },
			authHeaders,
		)

		expect(res.status).toBe(200)

		const data = await res.json()
		expect(data.history).toHaveLength(1)
		expect(data.history[0]?.matchId).toBe(matchId1)
	})

	it('calculates negative rating change correctly for losses', async () => {
		const db = drizzle(env.DB)
		const matchId1 = ctx.generateMatchId()

		await db.insert(guildMatches).values({
			id: matchId1,
			guildId: ctx.guildId,
			winningTeam: 'BLUE',
		})
		await db.insert(guildMatchParticipants).values({
			id: crypto.randomUUID(),
			matchId: matchId1,
			discordId: ctx.discordId,
			team: 'RED',
			role: 'BOTTOM',
			ratingBefore: 1600,
			ratingAfter: 1575,
		})

		const res = await client.v1.guilds[':guildId'].users[':discordId'].$get(
			{ param: { guildId: ctx.guildId, discordId: ctx.discordId }, query: {} },
			authHeaders,
		)

		expect(res.status).toBe(200)

		const data = await res.json()

		expect(data.history).toHaveLength(1)
		expect(data.history[0]?.ratingBefore).toBe(1600)
		expect(data.history[0]?.ratingAfter).toBe(1575)
		expect(data.history[0]?.change).toBe(-25)
		expect(data.history[0]?.won).toBe(false)
	})
})
