import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'
import { guildMatches, guildMatchParticipants, guildRatings, users } from '@/db/schema'
import { app } from '@/index'

describe('GET /v1/guilds/{guildId}/users/{discordId}/history', () => {
	const testGuildId = 'test-guild-123'
	const testDiscordId = 'test-user-123'
	const testDiscordId2 = 'test-user-456'
	const apiKey = 'test-api-key'

	const matchId1 = crypto.randomUUID()
	const matchId2 = crypto.randomUUID()
	const matchId3 = crypto.randomUUID()

	let env: { DB: D1Database; API_KEY: string }
	let dispose: () => Promise<void>

	beforeAll(async () => {
		const proxy = await getPlatformProxy<{ DB: D1Database; API_KEY: string }>({
			configPath: './wrangler.jsonc',
		})
		env = { ...proxy.env, API_KEY: apiKey }
		dispose = proxy.dispose
	})

	afterAll(async () => {
		await dispose()
	})

	beforeEach(async () => {
		const db = drizzle(env.DB)

		// Clean up test data
		await db.delete(guildMatchParticipants).where(eq(guildMatchParticipants.matchId, matchId1))
		await db.delete(guildMatchParticipants).where(eq(guildMatchParticipants.matchId, matchId2))
		await db.delete(guildMatchParticipants).where(eq(guildMatchParticipants.matchId, matchId3))
		await db.delete(guildMatches).where(eq(guildMatches.id, matchId1))
		await db.delete(guildMatches).where(eq(guildMatches.id, matchId2))
		await db.delete(guildMatches).where(eq(guildMatches.id, matchId3))
		await db
			.delete(guildRatings)
			.where(and(eq(guildRatings.guildId, testGuildId), eq(guildRatings.discordId, testDiscordId)))
		await db
			.delete(guildRatings)
			.where(and(eq(guildRatings.guildId, testGuildId), eq(guildRatings.discordId, testDiscordId2)))
		await db.delete(users).where(eq(users.discordId, testDiscordId))
		await db.delete(users).where(eq(users.discordId, testDiscordId2))

		// Set up test users
		await db.insert(users).values({ discordId: testDiscordId })
		await db.insert(users).values({ discordId: testDiscordId2 })
		await db.insert(guildRatings).values({
			guildId: testGuildId,
			discordId: testDiscordId,
			rating: 1500,
			wins: 0,
			losses: 0,
			placementGames: 0,
		})
	})

	it('returns match history for a user', async () => {
		const db = drizzle(env.DB)

		// Create 3 matches with the user participating
		const now = new Date()
		const match1Time = new Date(now.getTime() - 3000).toISOString()
		const match2Time = new Date(now.getTime() - 2000).toISOString()
		const match3Time = new Date(now.getTime() - 1000).toISOString()

		// Match 1: User on blue team (won)
		await db.insert(guildMatches).values({
			id: matchId1,
			guildId: testGuildId,
			winningTeam: 'blue',
			createdAt: match1Time,
		})
		await db.insert(guildMatchParticipants).values({
			id: crypto.randomUUID(),
			matchId: matchId1,
			discordId: testDiscordId,
			team: 'blue',
			role: 'top',
			ratingBefore: 1500,
			ratingAfter: 1525,
		})

		// Match 2: User on red team (lost)
		await db.insert(guildMatches).values({
			id: matchId2,
			guildId: testGuildId,
			winningTeam: 'blue',
			createdAt: match2Time,
		})
		await db.insert(guildMatchParticipants).values({
			id: crypto.randomUUID(),
			matchId: matchId2,
			discordId: testDiscordId,
			team: 'red',
			role: 'jungle',
			ratingBefore: 1525,
			ratingAfter: 1510,
		})

		// Match 3: User on blue team (won)
		await db.insert(guildMatches).values({
			id: matchId3,
			guildId: testGuildId,
			winningTeam: 'blue',
			createdAt: match3Time,
		})
		await db.insert(guildMatchParticipants).values({
			id: crypto.randomUUID(),
			matchId: matchId3,
			discordId: testDiscordId,
			team: 'blue',
			role: 'mid',
			ratingBefore: 1510,
			ratingAfter: 1535,
		})

		const res = await app.request(
			`/v1/guilds/${testGuildId}/users/${testDiscordId}/history`,
			{
				method: 'GET',
				headers: {
					'x-api-key': apiKey,
				},
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as {
			guildId: string
			discordId: string
			history: Array<{
				matchId: string
				team: 'blue' | 'red'
				role: string
				ratingBefore: number
				ratingAfter: number
				change: number
				won: boolean
				createdAt: string
			}>
		}

		expect(data.guildId).toBe(testGuildId)
		expect(data.discordId).toBe(testDiscordId)
		expect(data.history).toHaveLength(3)

		// Verify matches are ordered by createdAt (most recent first)
		expect(data.history[0]?.matchId).toBe(matchId3)
		expect(data.history[1]?.matchId).toBe(matchId2)
		expect(data.history[2]?.matchId).toBe(matchId1)

		// Verify match 3 details (most recent)
		expect(data.history[0]?.team).toBe('blue')
		expect(data.history[0]?.role).toBe('mid')
		expect(data.history[0]?.ratingBefore).toBe(1510)
		expect(data.history[0]?.ratingAfter).toBe(1535)
		expect(data.history[0]?.change).toBe(25)
		expect(data.history[0]?.won).toBe(true)

		// Verify match 2 details (lost)
		expect(data.history[1]?.team).toBe('red')
		expect(data.history[1]?.role).toBe('jungle')
		expect(data.history[1]?.ratingBefore).toBe(1525)
		expect(data.history[1]?.ratingAfter).toBe(1510)
		expect(data.history[1]?.change).toBe(-15)
		expect(data.history[1]?.won).toBe(false)

		// Verify match 1 details (won)
		expect(data.history[2]?.team).toBe('blue')
		expect(data.history[2]?.role).toBe('top')
		expect(data.history[2]?.ratingBefore).toBe(1500)
		expect(data.history[2]?.ratingAfter).toBe(1525)
		expect(data.history[2]?.change).toBe(25)
		expect(data.history[2]?.won).toBe(true)
	})

	it('respects the limit query parameter', async () => {
		const db = drizzle(env.DB)

		// Create 3 matches
		const now = new Date()
		for (let i = 0; i < 3; i++) {
			const matchId = crypto.randomUUID()
			const matchTime = new Date(now.getTime() - (3 - i) * 1000).toISOString()

			await db.insert(guildMatches).values({
				id: matchId,
				guildId: testGuildId,
				winningTeam: 'blue',
				createdAt: matchTime,
			})
			await db.insert(guildMatchParticipants).values({
				id: crypto.randomUUID(),
				matchId,
				discordId: testDiscordId,
				team: 'blue',
				role: 'top',
				ratingBefore: 1500,
				ratingAfter: 1525,
			})
		}

		// Request with limit=2
		const res = await app.request(
			`/v1/guilds/${testGuildId}/users/${testDiscordId}/history?limit=2`,
			{
				method: 'GET',
				headers: {
					'x-api-key': apiKey,
				},
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as { history: Array<unknown> }
		expect(data.history).toHaveLength(2)
	})

	it('returns default limit of 5 matches when limit is not specified', async () => {
		const db = drizzle(env.DB)

		// Create 7 matches
		const now = new Date()
		for (let i = 0; i < 7; i++) {
			const matchId = crypto.randomUUID()
			const matchTime = new Date(now.getTime() - (7 - i) * 1000).toISOString()

			await db.insert(guildMatches).values({
				id: matchId,
				guildId: testGuildId,
				winningTeam: 'blue',
				createdAt: matchTime,
			})
			await db.insert(guildMatchParticipants).values({
				id: crypto.randomUUID(),
				matchId,
				discordId: testDiscordId,
				team: 'blue',
				role: 'top',
				ratingBefore: 1500,
				ratingAfter: 1525,
			})
		}

		// Request without limit (should default to 5)
		const res = await app.request(
			`/v1/guilds/${testGuildId}/users/${testDiscordId}/history`,
			{
				method: 'GET',
				headers: {
					'x-api-key': apiKey,
				},
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as { history: Array<unknown> }
		expect(data.history).toHaveLength(5)
	})

	it('returns empty history for user with no matches', async () => {
		const res = await app.request(
			`/v1/guilds/${testGuildId}/users/${testDiscordId}/history`,
			{
				method: 'GET',
				headers: {
					'x-api-key': apiKey,
				},
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as {
			guildId: string
			discordId: string
			history: Array<unknown>
		}

		expect(data.guildId).toBe(testGuildId)
		expect(data.discordId).toBe(testDiscordId)
		expect(data.history).toHaveLength(0)
	})

	it('only returns matches for the specified guild', async () => {
		const db = drizzle(env.DB)
		const otherGuildId = 'other-guild-456'

		// Create match in test guild
		await db.insert(guildMatches).values({
			id: matchId1,
			guildId: testGuildId,
			winningTeam: 'blue',
		})
		await db.insert(guildMatchParticipants).values({
			id: crypto.randomUUID(),
			matchId: matchId1,
			discordId: testDiscordId,
			team: 'blue',
			role: 'top',
			ratingBefore: 1500,
			ratingAfter: 1525,
		})

		// Create match in other guild
		await db.insert(guildMatches).values({
			id: matchId2,
			guildId: otherGuildId,
			winningTeam: 'blue',
		})
		await db.insert(guildMatchParticipants).values({
			id: crypto.randomUUID(),
			matchId: matchId2,
			discordId: testDiscordId,
			team: 'blue',
			role: 'top',
			ratingBefore: 1500,
			ratingAfter: 1525,
		})

		const res = await app.request(
			`/v1/guilds/${testGuildId}/users/${testDiscordId}/history`,
			{
				method: 'GET',
				headers: {
					'x-api-key': apiKey,
				},
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as { history: Array<{ matchId: string }> }
		expect(data.history).toHaveLength(1)
		expect(data.history[0]?.matchId).toBe(matchId1)
	})

	it('only returns matches for the specified user', async () => {
		const db = drizzle(env.DB)

		// Create match with testDiscordId
		await db.insert(guildMatches).values({
			id: matchId1,
			guildId: testGuildId,
			winningTeam: 'blue',
		})
		await db.insert(guildMatchParticipants).values({
			id: crypto.randomUUID(),
			matchId: matchId1,
			discordId: testDiscordId,
			team: 'blue',
			role: 'top',
			ratingBefore: 1500,
			ratingAfter: 1525,
		})

		// Create match with testDiscordId2
		await db.insert(guildMatches).values({
			id: matchId2,
			guildId: testGuildId,
			winningTeam: 'blue',
		})
		await db.insert(guildMatchParticipants).values({
			id: crypto.randomUUID(),
			matchId: matchId2,
			discordId: testDiscordId2,
			team: 'blue',
			role: 'top',
			ratingBefore: 1500,
			ratingAfter: 1525,
		})

		const res = await app.request(
			`/v1/guilds/${testGuildId}/users/${testDiscordId}/history`,
			{
				method: 'GET',
				headers: {
					'x-api-key': apiKey,
				},
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as { history: Array<{ matchId: string }> }
		expect(data.history).toHaveLength(1)
		expect(data.history[0]?.matchId).toBe(matchId1)
	})

	it('returns 401 without API key', async () => {
		const res = await app.request(
			`/v1/guilds/${testGuildId}/users/${testDiscordId}/history`,
			{
				method: 'GET',
			},
			env,
		)

		expect(res.status).toBe(401)
	})

	it('calculates negative rating change correctly for losses', async () => {
		const db = drizzle(env.DB)

		// Create a match where user lost rating
		await db.insert(guildMatches).values({
			id: matchId1,
			guildId: testGuildId,
			winningTeam: 'blue',
		})
		await db.insert(guildMatchParticipants).values({
			id: crypto.randomUUID(),
			matchId: matchId1,
			discordId: testDiscordId,
			team: 'red',
			role: 'adc',
			ratingBefore: 1600,
			ratingAfter: 1575,
		})

		const res = await app.request(
			`/v1/guilds/${testGuildId}/users/${testDiscordId}/history`,
			{
				method: 'GET',
				headers: {
					'x-api-key': apiKey,
				},
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as {
			history: Array<{
				ratingBefore: number
				ratingAfter: number
				change: number
				won: boolean
			}>
		}

		expect(data.history).toHaveLength(1)
		expect(data.history[0]?.ratingBefore).toBe(1600)
		expect(data.history[0]?.ratingAfter).toBe(1575)
		expect(data.history[0]?.change).toBe(-25)
		expect(data.history[0]?.won).toBe(false)
	})
})
