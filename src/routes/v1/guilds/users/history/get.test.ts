import { beforeEach, describe, expect, it } from 'bun:test'
import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { env } from '@test/setup'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { guildMatches, guilds, guildUserMatchHistory, guildUserStats, users } from '@/db/schema'
import { typedApp } from './get'

describe('GET /v1/guilds/:guildId/users/:discordId/history', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('gets user match history', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values({ discordId: ctx.discordId })
		await db
			.insert(guildUserStats)
			.values({ guildId: ctx.guildId, discordId: ctx.discordId, rating: 1000, peakRating: 1000 })

		const [match1] = (await db
			.insert(guildMatches)
			.values({
				guildId: ctx.guildId,
				channelId: 'channel_123',
				messageId: `message1_${ctx.guildId}`,
				status: 'confirmed',
			})
			.returning()) as [typeof guildMatches.$inferSelect]

		const [match2] = (await db
			.insert(guildMatches)
			.values({
				guildId: ctx.guildId,
				channelId: 'channel_123',
				messageId: `message2_${ctx.guildId}`,
				status: 'confirmed',
			})
			.returning()) as [typeof guildMatches.$inferSelect]

		await db.insert(guildUserMatchHistory).values([
			{
				guildId: ctx.guildId,
				discordId: ctx.discordId,
				matchId: match1.id,
				result: 'WIN',
				ratingChange: 16,
				ratingAfter: 1016,
			},
			{
				guildId: ctx.guildId,
				discordId: ctx.discordId,
				matchId: match2.id,
				result: 'LOSE',
				ratingChange: -16,
				ratingAfter: 1000,
			},
		])

		const res = await client.v1.guilds[':guildId'].users[':discordId'].history.$get(
			{
				param: { guildId: ctx.guildId, discordId: ctx.discordId },
				query: {},
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.history).toHaveLength(2)
			expect(data.total).toBe(2)
		}
	})

	it('returns empty history when no matches', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values({ discordId: ctx.discordId })
		await db
			.insert(guildUserStats)
			.values({ guildId: ctx.guildId, discordId: ctx.discordId, rating: 1000, peakRating: 1000 })

		const res = await client.v1.guilds[':guildId'].users[':discordId'].history.$get(
			{
				param: { guildId: ctx.guildId, discordId: ctx.discordId },
				query: {},
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.history).toHaveLength(0)
			expect(data.total).toBe(0)
		}
	})

	it('supports pagination', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values({ discordId: ctx.discordId })
		await db
			.insert(guildUserStats)
			.values({ guildId: ctx.guildId, discordId: ctx.discordId, rating: 1000, peakRating: 1000 })

		// Create 3 matches
		const matches = await Promise.all(
			[1, 2, 3].map(async (i) => {
				const [match] = (await db
					.insert(guildMatches)
					.values({
						guildId: ctx.guildId,
						channelId: 'channel_123',
						messageId: `message${i}_${ctx.guildId}`,
						status: 'confirmed',
					})
					.returning()) as [typeof guildMatches.$inferSelect]
				return match
			}),
		)

		await db.insert(guildUserMatchHistory).values(
			matches.map((m, i) => ({
				guildId: ctx.guildId,
				discordId: ctx.discordId,
				matchId: m.id,
				result: 'WIN' as const,
				ratingChange: 16,
				ratingAfter: 1000 + (i + 1) * 16,
			})),
		)

		// Get first page
		const res = await client.v1.guilds[':guildId'].users[':discordId'].history.$get(
			{
				param: { guildId: ctx.guildId, discordId: ctx.discordId },
				query: { limit: '2', offset: '0' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.history).toHaveLength(2)
			expect(data.total).toBe(3)
		}
	})

	it('returns 404 when guild not found', async () => {
		const res = await client.v1.guilds[':guildId'].users[':discordId'].history.$get(
			{
				param: { guildId: ctx.guildId, discordId: ctx.discordId },
				query: {},
			},
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
		await db.insert(users).values({ discordId: ctx.discordId })

		const res = await client.v1.guilds[':guildId'].users[':discordId'].history.$get(
			{
				param: { guildId: ctx.guildId, discordId: ctx.discordId },
				query: {},
			},
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('User stats not found')
		}
	})
})
