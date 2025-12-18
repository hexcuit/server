import { env } from 'cloudflare:test'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { guildMatches, guildMatchParticipants, guildPendingMatches, guildRatings, users } from '@/db/schema'
import { app } from '@/index'

describe('POST /v1/guilds/{guildId}/matches/{matchId}/confirm', () => {
	let ctx: TestContext

	beforeEach(async () => {
		ctx = createTestContext()
	})

	describe('Success cases', () => {
		it('confirms match with blue team victory and updates ratings', async () => {
			const db = drizzle(env.DB)
			const matchId = ctx.generatePendingMatchId()

			await setupTestUsers(db, ctx)
			await db.insert(guildRatings).values([
				{ guildId: ctx.guildId, discordId: ctx.discordId, rating: 1500, wins: 0, losses: 0, placementGames: 0 },
				{ guildId: ctx.guildId, discordId: ctx.discordId2, rating: 1500, wins: 0, losses: 0, placementGames: 0 },
			])

			const teamAssignments = {
				[ctx.discordId]: { team: 'blue', role: 'TOP', rating: 1500 },
				[ctx.discordId2]: { team: 'red', role: 'TOP', rating: 1500 },
			}

			await db.insert(guildPendingMatches).values({
				id: matchId,
				guildId: ctx.guildId,
				channelId: ctx.channelId,
				messageId: ctx.messageId,
				status: 'voting',
				teamAssignments: JSON.stringify(teamAssignments),
				blueVotes: 1,
				redVotes: 0,
			})

			const res = await app.request(
				`/v1/guilds/${ctx.guildId}/matches/${matchId}/confirm`,
				{
					method: 'POST',
					headers: {
						'x-api-key': env.API_KEY,
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

			const player1Change = data.ratingChanges.find((rc) => rc.discordId === ctx.discordId)
			expect(player1Change).toBeDefined()
			expect(player1Change?.team).toBe('blue')
			expect(player1Change?.change).toBeGreaterThan(0)

			const player2Change = data.ratingChanges.find((rc) => rc.discordId === ctx.discordId2)
			expect(player2Change).toBeDefined()
			expect(player2Change?.team).toBe('red')
			expect(player2Change?.change).toBeLessThan(0)

			const matches = await db.select().from(guildMatches).where(eq(guildMatches.id, data.matchId))
			expect(matches).toHaveLength(1)
			expect(matches[0]?.winningTeam).toBe('blue')

			const participants = await db
				.select()
				.from(guildMatchParticipants)
				.where(eq(guildMatchParticipants.matchId, data.matchId))
			expect(participants).toHaveLength(2)

			const updatedRatings = await db.select().from(guildRatings).where(eq(guildRatings.guildId, ctx.guildId))
			expect(updatedRatings).toHaveLength(2)

			const player1Rating = updatedRatings.find((r) => r.discordId === ctx.discordId)
			expect(player1Rating?.wins).toBe(1)
			expect(player1Rating?.losses).toBe(0)
			expect(player1Rating?.placementGames).toBe(1)

			const player2Rating = updatedRatings.find((r) => r.discordId === ctx.discordId2)
			expect(player2Rating?.wins).toBe(0)
			expect(player2Rating?.losses).toBe(1)
			expect(player2Rating?.placementGames).toBe(1)

			const pendingMatch = await db.select().from(guildPendingMatches).where(eq(guildPendingMatches.id, matchId)).get()
			expect(pendingMatch?.status).toBe('confirmed')
		})

		it('confirms match with red team victory and updates ratings', async () => {
			const db = drizzle(env.DB)
			const matchId = ctx.generatePendingMatchId()

			await setupTestUsers(db, ctx)
			await db.insert(guildRatings).values([
				{ guildId: ctx.guildId, discordId: ctx.discordId, rating: 1500, wins: 0, losses: 0, placementGames: 0 },
				{ guildId: ctx.guildId, discordId: ctx.discordId2, rating: 1500, wins: 0, losses: 0, placementGames: 0 },
			])

			const teamAssignments = {
				[ctx.discordId]: { team: 'blue', role: 'TOP', rating: 1500 },
				[ctx.discordId2]: { team: 'red', role: 'TOP', rating: 1500 },
			}

			await db.insert(guildPendingMatches).values({
				id: matchId,
				guildId: ctx.guildId,
				channelId: ctx.channelId,
				messageId: ctx.messageId,
				status: 'voting',
				teamAssignments: JSON.stringify(teamAssignments),
				blueVotes: 0,
				redVotes: 1,
			})

			const res = await app.request(
				`/v1/guilds/${ctx.guildId}/matches/${matchId}/confirm`,
				{
					method: 'POST',
					headers: {
						'x-api-key': env.API_KEY,
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

			const updatedRatings = await db.select().from(guildRatings).where(eq(guildRatings.guildId, ctx.guildId))
			const player1Rating = updatedRatings.find((r) => r.discordId === ctx.discordId)
			const player2Rating = updatedRatings.find((r) => r.discordId === ctx.discordId2)

			expect(player1Rating?.wins).toBe(0)
			expect(player1Rating?.losses).toBe(1)

			expect(player2Rating?.wins).toBe(1)
			expect(player2Rating?.losses).toBe(0)
		})

		it('creates ratings for new users', async () => {
			const db = drizzle(env.DB)
			const matchId = ctx.generatePendingMatchId()

			await setupTestUsers(db, ctx)

			const teamAssignments = {
				[ctx.discordId]: { team: 'blue', role: 'TOP', rating: 1500 },
				[ctx.discordId2]: { team: 'red', role: 'TOP', rating: 1500 },
			}

			await db.insert(guildPendingMatches).values({
				id: matchId,
				guildId: ctx.guildId,
				channelId: ctx.channelId,
				messageId: ctx.messageId,
				status: 'voting',
				teamAssignments: JSON.stringify(teamAssignments),
				blueVotes: 1,
				redVotes: 0,
			})

			const res = await app.request(
				`/v1/guilds/${ctx.guildId}/matches/${matchId}/confirm`,
				{
					method: 'POST',
					headers: {
						'x-api-key': env.API_KEY,
					},
				},
				env,
			)

			expect(res.status).toBe(200)

			const ratings = await db.select().from(guildRatings).where(eq(guildRatings.guildId, ctx.guildId))
			expect(ratings).toHaveLength(2)

			const player1Rating = ratings.find((r) => r.discordId === ctx.discordId)
			expect(player1Rating).toBeDefined()
			expect(player1Rating?.wins).toBe(1)
			expect(player1Rating?.losses).toBe(0)
			expect(player1Rating?.placementGames).toBe(1)

			const player2Rating = ratings.find((r) => r.discordId === ctx.discordId2)
			expect(player2Rating).toBeDefined()
			expect(player2Rating?.wins).toBe(0)
			expect(player2Rating?.losses).toBe(1)
			expect(player2Rating?.placementGames).toBe(1)
		})

		it('confirms blue victory with majority (3 votes) in 4-player match', async () => {
			const db = drizzle(env.DB)
			const matchId = ctx.generatePendingMatchId()
			const player3 = ctx.generateUserId()
			const player4 = ctx.generateUserId()

			await setupTestUsers(db, ctx)
			await db.insert(users).values([{ discordId: player3 }, { discordId: player4 }])
			await db.insert(guildRatings).values([
				{ guildId: ctx.guildId, discordId: player3, rating: 1500, wins: 0, losses: 0, placementGames: 0 },
				{ guildId: ctx.guildId, discordId: player4, rating: 1500, wins: 0, losses: 0, placementGames: 0 },
			])

			const teamAssignments = {
				[ctx.discordId]: { team: 'blue', role: 'TOP', rating: 1500 },
				[ctx.discordId2]: { team: 'blue', role: 'MIDDLE', rating: 1500 },
				[player3]: { team: 'red', role: 'TOP', rating: 1500 },
				[player4]: { team: 'red', role: 'MIDDLE', rating: 1500 },
			}

			await db.insert(guildPendingMatches).values({
				id: matchId,
				guildId: ctx.guildId,
				channelId: ctx.channelId,
				messageId: ctx.messageId,
				status: 'voting',
				teamAssignments: JSON.stringify(teamAssignments),
				blueVotes: 3,
				redVotes: 1,
			})

			const res = await app.request(
				`/v1/guilds/${ctx.guildId}/matches/${matchId}/confirm`,
				{
					method: 'POST',
					headers: {
						'x-api-key': env.API_KEY,
					},
				},
				env,
			)

			expect(res.status).toBe(200)

			const data = (await res.json()) as {
				matchId: string
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
				`/v1/guilds/${ctx.guildId}/matches/${nonExistentMatchId}/confirm`,
				{
					method: 'POST',
					headers: {
						'x-api-key': env.API_KEY,
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
			const matchId = ctx.generatePendingMatchId()

			const teamAssignments = {
				[ctx.discordId]: { team: 'blue', role: 'TOP', rating: 1500 },
				[ctx.discordId2]: { team: 'red', role: 'TOP', rating: 1500 },
			}

			await db.insert(guildPendingMatches).values({
				id: matchId,
				guildId: ctx.guildId,
				channelId: ctx.channelId,
				messageId: ctx.messageId,
				status: 'confirmed',
				teamAssignments: JSON.stringify(teamAssignments),
				blueVotes: 1,
				redVotes: 0,
			})

			const res = await app.request(
				`/v1/guilds/${ctx.guildId}/matches/${matchId}/confirm`,
				{
					method: 'POST',
					headers: {
						'x-api-key': env.API_KEY,
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
			const matchId = ctx.generatePendingMatchId()

			const teamAssignments = {
				[ctx.discordId]: { team: 'blue', role: 'TOP', rating: 1500 },
				[ctx.discordId2]: { team: 'red', role: 'TOP', rating: 1500 },
			}

			await db.insert(guildPendingMatches).values({
				id: matchId,
				guildId: ctx.guildId,
				channelId: ctx.channelId,
				messageId: ctx.messageId,
				status: 'voting',
				teamAssignments: JSON.stringify(teamAssignments),
				blueVotes: 0,
				redVotes: 0,
			})

			const res = await app.request(
				`/v1/guilds/${ctx.guildId}/matches/${matchId}/confirm`,
				{
					method: 'POST',
					headers: {
						'x-api-key': env.API_KEY,
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
			const matchId = ctx.generatePendingMatchId()

			const teamAssignments = {
				[ctx.discordId]: { team: 'blue', role: 'TOP', rating: 1500 },
				[ctx.discordId2]: { team: 'red', role: 'TOP', rating: 1500 },
			}

			await db.insert(guildPendingMatches).values({
				id: matchId,
				guildId: ctx.guildId,
				channelId: ctx.channelId,
				messageId: ctx.messageId,
				status: 'voting',
				teamAssignments: JSON.stringify(teamAssignments),
				blueVotes: 1,
				redVotes: 0,
			})

			const res = await app.request(
				`/v1/guilds/${ctx.guildId}/matches/${matchId}/confirm`,
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
			const matchId = ctx.generatePendingMatchId()
			const player3 = ctx.generateUserId()

			await setupTestUsers(db, ctx)
			await db.insert(users).values({ discordId: player3 })
			await db
				.insert(guildRatings)
				.values([{ guildId: ctx.guildId, discordId: player3, rating: 1500, wins: 0, losses: 0, placementGames: 0 }])

			const teamAssignments = {
				[ctx.discordId]: { team: 'blue', role: 'TOP', rating: 1500 },
				[ctx.discordId2]: { team: 'red', role: 'TOP', rating: 1500 },
				[player3]: { team: 'red', role: 'MIDDLE', rating: 1500 },
			}

			await db.insert(guildPendingMatches).values({
				id: matchId,
				guildId: ctx.guildId,
				channelId: ctx.channelId,
				messageId: ctx.messageId,
				status: 'voting',
				teamAssignments: JSON.stringify(teamAssignments),
				blueVotes: 2,
				redVotes: 1,
			})

			const res = await app.request(
				`/v1/guilds/${ctx.guildId}/matches/${matchId}/confirm`,
				{
					method: 'POST',
					headers: {
						'x-api-key': env.API_KEY,
					},
				},
				env,
			)

			expect(res.status).toBe(200)

			const data = (await res.json()) as {
				matchId: string
				winningTeam: 'blue' | 'red'
			}

			expect(data.winningTeam).toBe('blue')
		})

		it('returns 400 for tie (equal votes)', async () => {
			const db = drizzle(env.DB)
			const matchId = ctx.generatePendingMatchId()
			const player3 = ctx.generateUserId()
			const player4 = ctx.generateUserId()

			const teamAssignments = {
				[ctx.discordId]: { team: 'blue', role: 'TOP', rating: 1500 },
				[ctx.discordId2]: { team: 'red', role: 'TOP', rating: 1500 },
				[player3]: { team: 'blue', role: 'MIDDLE', rating: 1500 },
				[player4]: { team: 'red', role: 'MIDDLE', rating: 1500 },
			}

			await db.insert(guildPendingMatches).values({
				id: matchId,
				guildId: ctx.guildId,
				channelId: ctx.channelId,
				messageId: ctx.messageId,
				status: 'voting',
				teamAssignments: JSON.stringify(teamAssignments),
				blueVotes: 1,
				redVotes: 1,
			})

			const res = await app.request(
				`/v1/guilds/${ctx.guildId}/matches/${matchId}/confirm`,
				{
					method: 'POST',
					headers: {
						'x-api-key': env.API_KEY,
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
			const matchId = ctx.generatePendingMatchId()

			await setupTestUsers(db, ctx)
			await db.insert(guildRatings).values([
				{ guildId: ctx.guildId, discordId: ctx.discordId, rating: 1500, wins: 0, losses: 0, placementGames: 0 },
				{ guildId: ctx.guildId, discordId: ctx.discordId2, rating: 1500, wins: 0, losses: 0, placementGames: 0 },
			])

			const teamAssignments = {
				[ctx.discordId]: { team: 'blue', role: 'TOP', rating: 1500 },
				[ctx.discordId2]: { team: 'red', role: 'TOP', rating: 1500 },
			}

			await db.insert(guildPendingMatches).values({
				id: matchId,
				guildId: ctx.guildId,
				channelId: ctx.channelId,
				messageId: ctx.messageId,
				status: 'voting',
				teamAssignments: JSON.stringify(teamAssignments),
				blueVotes: 1,
				redVotes: 0,
			})

			const res = await app.request(
				`/v1/guilds/${ctx.guildId}/matches/${matchId}/confirm`,
				{
					method: 'POST',
					headers: {
						'x-api-key': env.API_KEY,
					},
				},
				env,
			)

			expect(res.status).toBe(200)

			const data = (await res.json()) as {
				matchId: string
				ratingChanges: Array<{ change: number; discordId: string }>
			}

			const player1Change = data.ratingChanges.find((rc) => rc.discordId === ctx.discordId)
			const player2Change = data.ratingChanges.find((rc) => rc.discordId === ctx.discordId2)

			expect(Math.abs(player1Change?.change || 0)).toBeGreaterThan(30)
			expect(Math.abs(player2Change?.change || 0)).toBeGreaterThan(30)
		})

		it('has smaller rating change after placement games', async () => {
			const db = drizzle(env.DB)
			const matchId = ctx.generatePendingMatchId()

			await setupTestUsers(db, ctx)
			await db.insert(guildRatings).values([
				{ guildId: ctx.guildId, discordId: ctx.discordId, rating: 1500, wins: 5, losses: 5, placementGames: 10 },
				{ guildId: ctx.guildId, discordId: ctx.discordId2, rating: 1500, wins: 5, losses: 5, placementGames: 10 },
			])

			const teamAssignments = {
				[ctx.discordId]: { team: 'blue', role: 'TOP', rating: 1500 },
				[ctx.discordId2]: { team: 'red', role: 'TOP', rating: 1500 },
			}

			await db.insert(guildPendingMatches).values({
				id: matchId,
				guildId: ctx.guildId,
				channelId: ctx.channelId,
				messageId: ctx.messageId,
				status: 'voting',
				teamAssignments: JSON.stringify(teamAssignments),
				blueVotes: 1,
				redVotes: 0,
			})

			const res = await app.request(
				`/v1/guilds/${ctx.guildId}/matches/${matchId}/confirm`,
				{
					method: 'POST',
					headers: {
						'x-api-key': env.API_KEY,
					},
				},
				env,
			)

			expect(res.status).toBe(200)

			const data = (await res.json()) as {
				matchId: string
				ratingChanges: Array<{ change: number; discordId: string }>
			}

			const player1Change = data.ratingChanges.find((rc) => rc.discordId === ctx.discordId)
			const player2Change = data.ratingChanges.find((rc) => rc.discordId === ctx.discordId2)

			expect(Math.abs(player1Change?.change || 0)).toBeLessThanOrEqual(32)
			expect(Math.abs(player2Change?.change || 0)).toBeLessThanOrEqual(32)
		})
	})
})
