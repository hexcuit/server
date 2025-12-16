import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'
import { guildMatches, guildMatchParticipants, guildPendingMatches, guildRatings, users } from '@/db/schema'
import { app } from '@/index'

describe('POST /v1/guilds/{guildId}/matches/{matchId}/confirm', () => {
	const testGuildId = 'test-guild-123'
	const testChannelId = 'test-channel-123'
	const testMessageId = 'test-message-123'
	const apiKey = 'test-api-key'
	const matchId = crypto.randomUUID()

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
		await db.delete(guildMatchParticipants)
		await db.delete(guildMatches)
		await db.delete(guildPendingMatches).where(eq(guildPendingMatches.id, matchId))
		await db.delete(guildRatings).where(eq(guildRatings.guildId, testGuildId))
		await db.delete(users).where(eq(users.discordId, 'player1'))
		await db.delete(users).where(eq(users.discordId, 'player2'))
		await db.delete(users).where(eq(users.discordId, 'player3'))
		await db.delete(users).where(eq(users.discordId, 'player4'))
	})

	describe('Success cases', () => {
		it('confirms match with blue team victory and updates ratings', async () => {
			const db = drizzle(env.DB)

			// Setup users and ratings
			await db.insert(users).values([{ discordId: 'player1' }, { discordId: 'player2' }])
			await db.insert(guildRatings).values([
				{ guildId: testGuildId, discordId: 'player1', rating: 1500, wins: 0, losses: 0, placementGames: 0 },
				{ guildId: testGuildId, discordId: 'player2', rating: 1500, wins: 0, losses: 0, placementGames: 0 },
			])

			const teamAssignments = {
				player1: { team: 'blue', role: 'top', rating: 1500 },
				player2: { team: 'red', role: 'top', rating: 1500 },
			}

			await db.insert(guildPendingMatches).values({
				id: matchId,
				guildId: testGuildId,
				channelId: testChannelId,
				messageId: testMessageId,
				status: 'voting',
				teamAssignments: JSON.stringify(teamAssignments),
				blueVotes: 1, // 過半数 (total 2, required 1)
				redVotes: 0,
			})

			const res = await app.request(
				`/v1/guilds/${testGuildId}/matches/${matchId}/confirm`,
				{
					method: 'POST',
					headers: {
						'x-api-key': apiKey,
					},
				},
				env,
			)

			expect(res.status).toBe(200)

			const data = (await res.json()) as {
				matchId: string
				winningTeam: 'blue' | 'red'
				ratingChanges: Array<{
					discordId: string
					team: 'blue' | 'red'
					ratingBefore: number
					ratingAfter: number
					change: number
					rank: string
				}>
			}

			expect(data.winningTeam).toBe('blue')
			expect(data.ratingChanges).toHaveLength(2)

			// Blue team should have positive change
			const player1Change = data.ratingChanges.find((rc) => rc.discordId === 'player1')
			expect(player1Change).toBeDefined()
			expect(player1Change?.team).toBe('blue')
			expect(player1Change?.change).toBeGreaterThan(0)

			// Red team should have negative change
			const player2Change = data.ratingChanges.find((rc) => rc.discordId === 'player2')
			expect(player2Change).toBeDefined()
			expect(player2Change?.team).toBe('red')
			expect(player2Change?.change).toBeLessThan(0)

			// Verify guild_matches was created
			const matches = await db.select().from(guildMatches).where(eq(guildMatches.id, data.matchId))
			expect(matches).toHaveLength(1)
			expect(matches[0]?.winningTeam).toBe('blue')

			// Verify guild_match_participants was created
			const participants = await db.select().from(guildMatchParticipants)
			expect(participants).toHaveLength(2)

			// Verify guild_ratings was updated
			const updatedRatings = await db.select().from(guildRatings).where(eq(guildRatings.guildId, testGuildId))
			expect(updatedRatings).toHaveLength(2)

			const player1Rating = updatedRatings.find((r) => r.discordId === 'player1')
			expect(player1Rating?.wins).toBe(1)
			expect(player1Rating?.losses).toBe(0)
			expect(player1Rating?.placementGames).toBe(1)

			const player2Rating = updatedRatings.find((r) => r.discordId === 'player2')
			expect(player2Rating?.wins).toBe(0)
			expect(player2Rating?.losses).toBe(1)
			expect(player2Rating?.placementGames).toBe(1)

			// Verify pending match status was updated
			const pendingMatch = await db.select().from(guildPendingMatches).where(eq(guildPendingMatches.id, matchId)).get()
			expect(pendingMatch?.status).toBe('confirmed')
		})

		it('confirms match with red team victory and updates ratings', async () => {
			const db = drizzle(env.DB)

			await db.insert(users).values([{ discordId: 'player1' }, { discordId: 'player2' }])
			await db.insert(guildRatings).values([
				{ guildId: testGuildId, discordId: 'player1', rating: 1500, wins: 0, losses: 0, placementGames: 0 },
				{ guildId: testGuildId, discordId: 'player2', rating: 1500, wins: 0, losses: 0, placementGames: 0 },
			])

			const teamAssignments = {
				player1: { team: 'blue', role: 'top', rating: 1500 },
				player2: { team: 'red', role: 'top', rating: 1500 },
			}

			await db.insert(guildPendingMatches).values({
				id: matchId,
				guildId: testGuildId,
				channelId: testChannelId,
				messageId: testMessageId,
				status: 'voting',
				teamAssignments: JSON.stringify(teamAssignments),
				blueVotes: 0,
				redVotes: 1, // 過半数 (total 2, required 1)
			})

			const res = await app.request(
				`/v1/guilds/${testGuildId}/matches/${matchId}/confirm`,
				{
					method: 'POST',
					headers: {
						'x-api-key': apiKey,
					},
				},
				env,
			)

			expect(res.status).toBe(200)

			const data = (await res.json()) as {
				matchId: string
				winningTeam: 'blue' | 'red'
			}

			expect(data.winningTeam).toBe('red')

			const updatedRatings = await db.select().from(guildRatings).where(eq(guildRatings.guildId, testGuildId))
			const player1Rating = updatedRatings.find((r) => r.discordId === 'player1')
			const player2Rating = updatedRatings.find((r) => r.discordId === 'player2')

			// Blue team lost
			expect(player1Rating?.wins).toBe(0)
			expect(player1Rating?.losses).toBe(1)

			// Red team won
			expect(player2Rating?.wins).toBe(1)
			expect(player2Rating?.losses).toBe(0)
		})

		it('creates ratings for new users', async () => {
			const db = drizzle(env.DB)

			// Create users but no ratings
			await db.insert(users).values([{ discordId: 'player1' }, { discordId: 'player2' }])

			const teamAssignments = {
				player1: { team: 'blue', role: 'top', rating: 1500 },
				player2: { team: 'red', role: 'top', rating: 1500 },
			}

			await db.insert(guildPendingMatches).values({
				id: matchId,
				guildId: testGuildId,
				channelId: testChannelId,
				messageId: testMessageId,
				status: 'voting',
				teamAssignments: JSON.stringify(teamAssignments),
				blueVotes: 1,
				redVotes: 0,
			})

			const res = await app.request(
				`/v1/guilds/${testGuildId}/matches/${matchId}/confirm`,
				{
					method: 'POST',
					headers: {
						'x-api-key': apiKey,
					},
				},
				env,
			)

			expect(res.status).toBe(200)

			// Verify new ratings were created
			const ratings = await db.select().from(guildRatings).where(eq(guildRatings.guildId, testGuildId))
			expect(ratings).toHaveLength(2)

			const player1Rating = ratings.find((r) => r.discordId === 'player1')
			expect(player1Rating).toBeDefined()
			expect(player1Rating?.wins).toBe(1)
			expect(player1Rating?.losses).toBe(0)
			expect(player1Rating?.placementGames).toBe(1)

			const player2Rating = ratings.find((r) => r.discordId === 'player2')
			expect(player2Rating).toBeDefined()
			expect(player2Rating?.wins).toBe(0)
			expect(player2Rating?.losses).toBe(1)
			expect(player2Rating?.placementGames).toBe(1)
		})

		it('confirms blue victory with majority (3 votes) in 4-player match', async () => {
			const db = drizzle(env.DB)

			await db
				.insert(users)
				.values([
					{ discordId: 'player1' },
					{ discordId: 'player2' },
					{ discordId: 'player3' },
					{ discordId: 'player4' },
				])

			const teamAssignments = {
				player1: { team: 'blue', role: 'top', rating: 1500 },
				player2: { team: 'blue', role: 'mid', rating: 1500 },
				player3: { team: 'red', role: 'top', rating: 1500 },
				player4: { team: 'red', role: 'mid', rating: 1500 },
			}

			await db.insert(guildPendingMatches).values({
				id: matchId,
				guildId: testGuildId,
				channelId: testChannelId,
				messageId: testMessageId,
				status: 'voting',
				teamAssignments: JSON.stringify(teamAssignments),
				blueVotes: 3, // 過半数 (total 4, required 2)
				redVotes: 1,
			})

			const res = await app.request(
				`/v1/guilds/${testGuildId}/matches/${matchId}/confirm`,
				{
					method: 'POST',
					headers: {
						'x-api-key': apiKey,
					},
				},
				env,
			)

			expect(res.status).toBe(200)

			const data = (await res.json()) as {
				winningTeam: 'blue' | 'red'
				ratingChanges: Array<{ discordId: string }>
			}

			expect(data.winningTeam).toBe('blue')
			expect(data.ratingChanges).toHaveLength(4)
		})
	})

	describe('Error cases', () => {
		it('returns 404 for non-existent match', async () => {
			const nonExistentMatchId = crypto.randomUUID()

			const res = await app.request(
				`/v1/guilds/${testGuildId}/matches/${nonExistentMatchId}/confirm`,
				{
					method: 'POST',
					headers: {
						'x-api-key': apiKey,
					},
				},
				env,
			)

			expect(res.status).toBe(404)
			const data = await res.json()
			expect(data).toHaveProperty('message', 'Match not found')
		})

		it('returns 400 when match is not in voting state', async () => {
			const db = drizzle(env.DB)

			const teamAssignments = {
				player1: { team: 'blue', role: 'top', rating: 1500 },
				player2: { team: 'red', role: 'top', rating: 1500 },
			}

			await db.insert(guildPendingMatches).values({
				id: matchId,
				guildId: testGuildId,
				channelId: testChannelId,
				messageId: testMessageId,
				status: 'confirmed',
				teamAssignments: JSON.stringify(teamAssignments),
				blueVotes: 1,
				redVotes: 0,
			})

			const res = await app.request(
				`/v1/guilds/${testGuildId}/matches/${matchId}/confirm`,
				{
					method: 'POST',
					headers: {
						'x-api-key': apiKey,
					},
				},
				env,
			)

			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data).toHaveProperty('message', 'Match is not in voting state')
		})

		it('returns 400 when there are not enough votes', async () => {
			const db = drizzle(env.DB)

			const teamAssignments = {
				player1: { team: 'blue', role: 'top', rating: 1500 },
				player2: { team: 'red', role: 'top', rating: 1500 },
			}

			await db.insert(guildPendingMatches).values({
				id: matchId,
				guildId: testGuildId,
				channelId: testChannelId,
				messageId: testMessageId,
				status: 'voting',
				teamAssignments: JSON.stringify(teamAssignments),
				blueVotes: 0, // 過半数に達していない
				redVotes: 0,
			})

			const res = await app.request(
				`/v1/guilds/${testGuildId}/matches/${matchId}/confirm`,
				{
					method: 'POST',
					headers: {
						'x-api-key': apiKey,
					},
				},
				env,
			)

			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data).toHaveProperty('message', 'Not enough votes')
		})

		it('returns 401 without API key', async () => {
			const db = drizzle(env.DB)

			const teamAssignments = {
				player1: { team: 'blue', role: 'top', rating: 1500 },
				player2: { team: 'red', role: 'top', rating: 1500 },
			}

			await db.insert(guildPendingMatches).values({
				id: matchId,
				guildId: testGuildId,
				channelId: testChannelId,
				messageId: testMessageId,
				status: 'voting',
				teamAssignments: JSON.stringify(teamAssignments),
				blueVotes: 1,
				redVotes: 0,
			})

			const res = await app.request(
				`/v1/guilds/${testGuildId}/matches/${matchId}/confirm`,
				{
					method: 'POST',
				},
				env,
			)

			expect(res.status).toBe(401)
		})
	})

	describe('Edge cases', () => {
		it('correctly calculates majority (2 votes) for 3 players', async () => {
			const db = drizzle(env.DB)

			await db.insert(users).values([{ discordId: 'player1' }, { discordId: 'player2' }, { discordId: 'player3' }])

			const teamAssignments = {
				player1: { team: 'blue', role: 'top', rating: 1500 },
				player2: { team: 'red', role: 'top', rating: 1500 },
				player3: { team: 'red', role: 'mid', rating: 1500 },
			}

			await db.insert(guildPendingMatches).values({
				id: matchId,
				guildId: testGuildId,
				channelId: testChannelId,
				messageId: testMessageId,
				status: 'voting',
				teamAssignments: JSON.stringify(teamAssignments),
				blueVotes: 2, // 過半数 (total 3, required 2)
				redVotes: 1,
			})

			const res = await app.request(
				`/v1/guilds/${testGuildId}/matches/${matchId}/confirm`,
				{
					method: 'POST',
					headers: {
						'x-api-key': apiKey,
					},
				},
				env,
			)

			expect(res.status).toBe(200)

			const data = (await res.json()) as {
				winningTeam: 'blue' | 'red'
			}

			expect(data.winningTeam).toBe('blue')
		})

		it('returns 400 for tie (equal votes)', async () => {
			const db = drizzle(env.DB)

			const teamAssignments = {
				player1: { team: 'blue', role: 'top', rating: 1500 },
				player2: { team: 'red', role: 'top', rating: 1500 },
				player3: { team: 'blue', role: 'mid', rating: 1500 },
				player4: { team: 'red', role: 'mid', rating: 1500 },
			}

			await db.insert(guildPendingMatches).values({
				id: matchId,
				guildId: testGuildId,
				channelId: testChannelId,
				messageId: testMessageId,
				status: 'voting',
				teamAssignments: JSON.stringify(teamAssignments),
				blueVotes: 1, // 同数かつ過半数に達していない (total 4, required 2)
				redVotes: 1,
			})

			const res = await app.request(
				`/v1/guilds/${testGuildId}/matches/${matchId}/confirm`,
				{
					method: 'POST',
					headers: {
						'x-api-key': apiKey,
					},
				},
				env,
			)

			expect(res.status).toBe(400)
			const data = await res.json()
			expect(data).toHaveProperty('message', 'Not enough votes')
		})

		it('has larger rating change during placement games', async () => {
			const db = drizzle(env.DB)

			await db.insert(users).values([{ discordId: 'player1' }, { discordId: 'player2' }])
			await db.insert(guildRatings).values([
				{ guildId: testGuildId, discordId: 'player1', rating: 1500, wins: 0, losses: 0, placementGames: 0 },
				{ guildId: testGuildId, discordId: 'player2', rating: 1500, wins: 0, losses: 0, placementGames: 0 },
			])

			const teamAssignments = {
				player1: { team: 'blue', role: 'top', rating: 1500 },
				player2: { team: 'red', role: 'top', rating: 1500 },
			}

			await db.insert(guildPendingMatches).values({
				id: matchId,
				guildId: testGuildId,
				channelId: testChannelId,
				messageId: testMessageId,
				status: 'voting',
				teamAssignments: JSON.stringify(teamAssignments),
				blueVotes: 1,
				redVotes: 0,
			})

			const res = await app.request(
				`/v1/guilds/${testGuildId}/matches/${matchId}/confirm`,
				{
					method: 'POST',
					headers: {
						'x-api-key': apiKey,
					},
				},
				env,
			)

			expect(res.status).toBe(200)

			const data = (await res.json()) as {
				ratingChanges: Array<{ change: number; discordId: string }>
			}

			const player1Change = data.ratingChanges.find((rc) => rc.discordId === 'player1')
			const player2Change = data.ratingChanges.find((rc) => rc.discordId === 'player2')

			// Placement games should have larger K-factor (80 vs 32)
			expect(Math.abs(player1Change?.change || 0)).toBeGreaterThan(30)
			expect(Math.abs(player2Change?.change || 0)).toBeGreaterThan(30)
		})

		it('has smaller rating change after placement games', async () => {
			const db = drizzle(env.DB)

			await db.insert(users).values([{ discordId: 'player1' }, { discordId: 'player2' }])
			await db.insert(guildRatings).values([
				{ guildId: testGuildId, discordId: 'player1', rating: 1500, wins: 5, losses: 5, placementGames: 10 },
				{ guildId: testGuildId, discordId: 'player2', rating: 1500, wins: 5, losses: 5, placementGames: 10 },
			])

			const teamAssignments = {
				player1: { team: 'blue', role: 'top', rating: 1500 },
				player2: { team: 'red', role: 'top', rating: 1500 },
			}

			await db.insert(guildPendingMatches).values({
				id: matchId,
				guildId: testGuildId,
				channelId: testChannelId,
				messageId: testMessageId,
				status: 'voting',
				teamAssignments: JSON.stringify(teamAssignments),
				blueVotes: 1,
				redVotes: 0,
			})

			const res = await app.request(
				`/v1/guilds/${testGuildId}/matches/${matchId}/confirm`,
				{
					method: 'POST',
					headers: {
						'x-api-key': apiKey,
					},
				},
				env,
			)

			expect(res.status).toBe(200)

			const data = (await res.json()) as {
				ratingChanges: Array<{ change: number; discordId: string }>
			}

			const player1Change = data.ratingChanges.find((rc) => rc.discordId === 'player1')
			const player2Change = data.ratingChanges.find((rc) => rc.discordId === 'player2')

			// Non-placement games should have smaller K-factor
			expect(Math.abs(player1Change?.change || 0)).toBeLessThanOrEqual(32)
			expect(Math.abs(player2Change?.change || 0)).toBeLessThanOrEqual(32)
		})
	})
})
