import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { env } from '@test/setup'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { guildMatches, guilds, guildUserMatchHistory, guildUserStats, users } from '@/db/schema'
import { typedApp } from './get'

describe('GET /v1/guilds/:guildId/users/:discordId/history', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('returns match history ordered by date descending', async () => {
		const db = drizzle(env.DB)
		const matchId1 = ctx.generateMatchId()
		const matchId2 = ctx.generateMatchId()

		await db.insert(users).values({ discordId: ctx.discordId })
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(guildUserStats).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
			rating: 1215,
			peakRating: 1215,
		})
		await db.insert(guildMatches).values([
			{
				id: matchId1,
				guildId: ctx.guildId,
				channelId: ctx.channelId,
				messageId: `${ctx.messageId}-1`,
				status: 'confirmed',
			},
			{
				id: matchId2,
				guildId: ctx.guildId,
				channelId: ctx.channelId,
				messageId: `${ctx.messageId}-2`,
				status: 'confirmed',
			},
		])
		await db.insert(guildUserMatchHistory).values([
			{
				guildId: ctx.guildId,
				discordId: ctx.discordId,
				matchId: matchId1,
				result: 'WIN',
				ratingChange: 15,
				ratingAfter: 1215,
			},
			{
				guildId: ctx.guildId,
				discordId: ctx.discordId,
				matchId: matchId2,
				result: 'LOSE',
				ratingChange: -12,
				ratingAfter: 1203,
			},
		])

		const res = await client.v1.guilds[':guildId'].users[':discordId'].history.$get(
			{ param: { guildId: ctx.guildId, discordId: ctx.discordId }, query: {} },
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.total).toBe(2)
			expect(data.history).toHaveLength(2)
			// First should have matchId2 (added later, so createdAt is newer)
			expect(data.history.at(0)?.matchId).toBe(matchId2)
			expect(data.history.at(0)?.result).toBe('LOSE')
			expect(data.history.at(0)?.ratingChange).toBe(-12)
			expect(data.history.at(1)?.matchId).toBe(matchId1)
			expect(data.history.at(1)?.result).toBe('WIN')
			expect(data.history.at(1)?.ratingChange).toBe(15)
		}
	})

	it('returns paginated history with limit and offset', async () => {
		const db = drizzle(env.DB)
		const matchId1 = ctx.generateMatchId()
		const matchId2 = ctx.generateMatchId()
		const matchId3 = ctx.generateMatchId()

		await db.insert(users).values({ discordId: ctx.discordId })
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(guildUserStats).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
			rating: 1200,
			peakRating: 1200,
		})
		await db.insert(guildMatches).values([
			{
				id: matchId1,
				guildId: ctx.guildId,
				channelId: ctx.channelId,
				messageId: `${ctx.messageId}-1`,
				status: 'confirmed',
			},
			{
				id: matchId2,
				guildId: ctx.guildId,
				channelId: ctx.channelId,
				messageId: `${ctx.messageId}-2`,
				status: 'confirmed',
			},
			{
				id: matchId3,
				guildId: ctx.guildId,
				channelId: ctx.channelId,
				messageId: `${ctx.messageId}-3`,
				status: 'confirmed',
			},
		])
		await db.insert(guildUserMatchHistory).values([
			{
				guildId: ctx.guildId,
				discordId: ctx.discordId,
				matchId: matchId1,
				result: 'WIN',
				ratingChange: 15,
				ratingAfter: 1215,
			},
			{
				guildId: ctx.guildId,
				discordId: ctx.discordId,
				matchId: matchId2,
				result: 'WIN',
				ratingChange: 14,
				ratingAfter: 1229,
			},
			{
				guildId: ctx.guildId,
				discordId: ctx.discordId,
				matchId: matchId3,
				result: 'LOSE',
				ratingChange: -12,
				ratingAfter: 1217,
			},
		])

		const res = await client.v1.guilds[':guildId'].users[':discordId'].history.$get(
			{
				param: { guildId: ctx.guildId, discordId: ctx.discordId },
				query: { limit: '1', offset: '1' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.total).toBe(3)
			expect(data.history).toHaveLength(1)
		}
	})

	it('returns empty history when user has no matches', async () => {
		const db = drizzle(env.DB)
		await db.insert(users).values({ discordId: ctx.discordId })
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(guildUserStats).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
			rating: 1200,
			peakRating: 1200,
		})

		const res = await client.v1.guilds[':guildId'].users[':discordId'].history.$get(
			{ param: { guildId: ctx.guildId, discordId: ctx.discordId }, query: {} },
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.total).toBe(0)
			expect(data.history).toHaveLength(0)
		}
	})

	it('returns 404 when guild not found', async () => {
		const res = await client.v1.guilds[':guildId'].users[':discordId'].history.$get(
			{ param: { guildId: 'nonexistent', discordId: ctx.discordId }, query: {} },
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Guild not found')
		}
	})

	it('returns 404 when user stats not found', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].users[':discordId'].history.$get(
			{ param: { guildId: ctx.guildId, discordId: 'nonexistent' }, query: {} },
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('User stats not found')
		}
	})
})
