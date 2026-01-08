import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { env } from '@test/setup'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { INITIAL_RATING } from '@/constants/rating'
import { guildMatches, guildMatchPlayers, guilds, guildUserStats, users } from '@/db/schema'
import { typedApp } from './post'

describe('POST /v1/guilds/:guildId/matches/:matchId/vote', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('records vote and returns voting status', async () => {
		const db = drizzle(env.DB)
		const matchId = ctx.generateMatchId()
		await db.insert(users).values([{ discordId: ctx.discordId }, { discordId: ctx.discordId2 }])
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(guildMatches).values({
			id: matchId,
			guildId: ctx.guildId,
			channelId: ctx.channelId,
			messageId: ctx.messageId,
			status: 'voting',
		})
		await db.insert(guildMatchPlayers).values([
			{
				matchId,
				discordId: ctx.discordId,
				team: 'BLUE',
				role: 'MIDDLE',
				ratingBefore: INITIAL_RATING,
			},
			{
				matchId,
				discordId: ctx.discordId2,
				team: 'RED',
				role: 'BOTTOM',
				ratingBefore: INITIAL_RATING,
			},
		])

		const res = await client.v1.guilds[':guildId'].matches[':matchId'].vote.$post(
			{
				param: { guildId: ctx.guildId, matchId },
				json: { discordId: ctx.discordId, vote: 'BLUE' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.status).toBe('voting')
			if (data.status === 'voting') {
				expect(data.votes.blueVotes).toBe(1)
				expect(data.votes.redVotes).toBe(0)
				expect(data.votes.drawVotes).toBe(0)
				expect(data.votes.totalParticipants).toBe(2)
				expect(data.votes.votesRequired).toBe(2)
			}
		}
	})

	it('confirms match when majority is reached', async () => {
		const db = drizzle(env.DB)
		const matchId = ctx.generateMatchId()
		await db.insert(users).values([{ discordId: ctx.discordId }, { discordId: ctx.discordId2 }])
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(guildMatches).values({
			id: matchId,
			guildId: ctx.guildId,
			channelId: ctx.channelId,
			messageId: ctx.messageId,
			status: 'voting',
			blueVotes: 1,
		})
		await db.insert(guildMatchPlayers).values([
			{
				matchId,
				discordId: ctx.discordId,
				team: 'BLUE',
				role: 'MIDDLE',
				ratingBefore: INITIAL_RATING,
			},
			{
				matchId,
				discordId: ctx.discordId2,
				team: 'RED',
				role: 'BOTTOM',
				ratingBefore: INITIAL_RATING,
			},
		])
		await db.insert(guildUserStats).values([
			{
				guildId: ctx.guildId,
				discordId: ctx.discordId,
				rating: INITIAL_RATING,
				peakRating: INITIAL_RATING,
			},
			{
				guildId: ctx.guildId,
				discordId: ctx.discordId2,
				rating: INITIAL_RATING,
				peakRating: INITIAL_RATING,
			},
		])

		const res = await client.v1.guilds[':guildId'].matches[':matchId'].vote.$post(
			{
				param: { guildId: ctx.guildId, matchId },
				json: { discordId: ctx.discordId2, vote: 'BLUE' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.status).toBe('confirmed')
			if (data.status === 'confirmed') {
				expect(data.winningTeam).toBe('BLUE')
				expect(data.ratingChanges).toHaveLength(2)
			}
		}

		// Verify match was confirmed
		const match = await db.select().from(guildMatches).where(eq(guildMatches.id, matchId)).get()
		expect(match?.status).toBe('confirmed')
		expect(match?.winningTeam).toBe('BLUE')
	})

	it('allows player to change their vote', async () => {
		const db = drizzle(env.DB)
		const matchId = ctx.generateMatchId()
		await db.insert(users).values([{ discordId: ctx.discordId }, { discordId: ctx.discordId2 }])
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(guildMatches).values({
			id: matchId,
			guildId: ctx.guildId,
			channelId: ctx.channelId,
			messageId: ctx.messageId,
			status: 'voting',
		})
		await db.insert(guildMatchPlayers).values([
			{
				matchId,
				discordId: ctx.discordId,
				team: 'BLUE',
				role: 'MIDDLE',
				ratingBefore: INITIAL_RATING,
			},
			{
				matchId,
				discordId: ctx.discordId2,
				team: 'RED',
				role: 'BOTTOM',
				ratingBefore: INITIAL_RATING,
			},
		])

		// First vote
		await client.v1.guilds[':guildId'].matches[':matchId'].vote.$post(
			{
				param: { guildId: ctx.guildId, matchId },
				json: { discordId: ctx.discordId, vote: 'BLUE' },
			},
			authHeaders,
		)

		// Change vote
		const res = await client.v1.guilds[':guildId'].matches[':matchId'].vote.$post(
			{
				param: { guildId: ctx.guildId, matchId },
				json: { discordId: ctx.discordId, vote: 'RED' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			if (data.status === 'voting') {
				expect(data.votes.blueVotes).toBe(0)
				expect(data.votes.redVotes).toBe(1)
			}
		}
	})

	it('returns 404 when match not found', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].matches[':matchId'].vote.$post(
			{
				param: { guildId: ctx.guildId, matchId: 'nonexistent' },
				json: { discordId: ctx.discordId, vote: 'BLUE' },
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
		const matchId = ctx.generateMatchId()
		await db.insert(users).values({ discordId: ctx.discordId })
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(guildMatches).values({
			id: matchId,
			guildId: ctx.guildId,
			channelId: ctx.channelId,
			messageId: ctx.messageId,
			status: 'confirmed',
			winningTeam: 'BLUE',
		})
		await db.insert(guildMatchPlayers).values({
			matchId,
			discordId: ctx.discordId,
			team: 'BLUE',
			role: 'MIDDLE',
			ratingBefore: INITIAL_RATING,
		})

		const res = await client.v1.guilds[':guildId'].matches[':matchId'].vote.$post(
			{
				param: { guildId: ctx.guildId, matchId },
				json: { discordId: ctx.discordId, vote: 'BLUE' },
			},
			authHeaders,
		)

		expect(res.status).toBe(400)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Match already confirmed')
		}
	})

	it('returns 404 when player not in match', async () => {
		const db = drizzle(env.DB)
		const matchId = ctx.generateMatchId()
		await db.insert(users).values({ discordId: ctx.discordId })
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(guildMatches).values({
			id: matchId,
			guildId: ctx.guildId,
			channelId: ctx.channelId,
			messageId: ctx.messageId,
			status: 'voting',
		})

		const res = await client.v1.guilds[':guildId'].matches[':matchId'].vote.$post(
			{
				param: { guildId: ctx.guildId, matchId },
				json: { discordId: ctx.discordId, vote: 'BLUE' },
			},
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Player not in match')
		}
	})

	it('confirms match with RED winning when majority votes RED', async () => {
		const db = drizzle(env.DB)
		const matchId = ctx.generateMatchId()
		await db.insert(users).values([{ discordId: ctx.discordId }, { discordId: ctx.discordId2 }])
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(guildMatches).values({
			id: matchId,
			guildId: ctx.guildId,
			channelId: ctx.channelId,
			messageId: ctx.messageId,
			status: 'voting',
			redVotes: 1,
		})
		await db.insert(guildMatchPlayers).values([
			{
				matchId,
				discordId: ctx.discordId,
				team: 'BLUE',
				role: 'MIDDLE',
				ratingBefore: INITIAL_RATING,
			},
			{
				matchId,
				discordId: ctx.discordId2,
				team: 'RED',
				role: 'BOTTOM',
				ratingBefore: INITIAL_RATING,
			},
		])
		await db.insert(guildUserStats).values([
			{
				guildId: ctx.guildId,
				discordId: ctx.discordId,
				rating: INITIAL_RATING,
				peakRating: INITIAL_RATING,
			},
			{
				guildId: ctx.guildId,
				discordId: ctx.discordId2,
				rating: INITIAL_RATING,
				peakRating: INITIAL_RATING,
			},
		])

		const res = await client.v1.guilds[':guildId'].matches[':matchId'].vote.$post(
			{
				param: { guildId: ctx.guildId, matchId },
				json: { discordId: ctx.discordId, vote: 'RED' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.status).toBe('confirmed')
			if (data.status === 'confirmed') {
				expect(data.winningTeam).toBe('RED')
				expect(data.ratingChanges).toHaveLength(2)
				const redPlayerChange = data.ratingChanges.find((r) => r.team === 'RED')
				expect(redPlayerChange?.ratingChange).toBeGreaterThan(0)
				const bluePlayerChange = data.ratingChanges.find((r) => r.team === 'BLUE')
				expect(bluePlayerChange?.ratingChange).toBeLessThan(0)
			}
		}

		const match = await db.select().from(guildMatches).where(eq(guildMatches.id, matchId)).get()
		expect(match?.status).toBe('confirmed')
		expect(match?.winningTeam).toBe('RED')
	})

	it('confirms match with DRAW when majority votes DRAW', async () => {
		const db = drizzle(env.DB)
		const matchId = ctx.generateMatchId()
		await db.insert(users).values([{ discordId: ctx.discordId }, { discordId: ctx.discordId2 }])
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(guildMatches).values({
			id: matchId,
			guildId: ctx.guildId,
			channelId: ctx.channelId,
			messageId: ctx.messageId,
			status: 'voting',
			drawVotes: 1,
		})
		await db.insert(guildMatchPlayers).values([
			{
				matchId,
				discordId: ctx.discordId,
				team: 'BLUE',
				role: 'MIDDLE',
				ratingBefore: INITIAL_RATING,
			},
			{
				matchId,
				discordId: ctx.discordId2,
				team: 'RED',
				role: 'BOTTOM',
				ratingBefore: INITIAL_RATING,
			},
		])
		await db.insert(guildUserStats).values([
			{
				guildId: ctx.guildId,
				discordId: ctx.discordId,
				rating: INITIAL_RATING,
				peakRating: INITIAL_RATING,
			},
			{
				guildId: ctx.guildId,
				discordId: ctx.discordId2,
				rating: INITIAL_RATING,
				peakRating: INITIAL_RATING,
			},
		])

		const res = await client.v1.guilds[':guildId'].matches[':matchId'].vote.$post(
			{
				param: { guildId: ctx.guildId, matchId },
				json: { discordId: ctx.discordId, vote: 'DRAW' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.status).toBe('confirmed')
			if (data.status === 'confirmed') {
				expect(data.winningTeam).toBe('DRAW')
				expect(data.ratingChanges).toHaveLength(2)
				for (const change of data.ratingChanges) {
					expect(change.ratingChange).toBe(0)
				}
			}
		}

		const match = await db.select().from(guildMatches).where(eq(guildMatches.id, matchId)).get()
		expect(match?.status).toBe('confirmed')
		expect(match?.winningTeam).toBe('DRAW')
	})
})
