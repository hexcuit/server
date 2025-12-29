import { beforeEach, describe, expect, it } from 'bun:test'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, type TestContext } from '@/__tests__/test-utils'
import { guilds, guildUserStats, users } from '@/db/schema'
import { typedApp } from './get'

describe('GET /v1/guilds/:guildId/users/:discordId/stats', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('returns user stats', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values({ discordId: ctx.discordId })
		await db.insert(guildUserStats).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
			rating: 1350,
			wins: 10,
			losses: 5,
			placementGames: 5,
			peakRating: 1400,
			currentStreak: 3,
		})

		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.$get(
			{
				param: { guildId: ctx.guildId, discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.discordId).toBe(ctx.discordId)
			expect(data.rating).toBe(1350)
			expect(data.wins).toBe(10)
			expect(data.losses).toBe(5)
			expect(data.placementGames).toBe(5)
			expect(data.peakRating).toBe(1400)
			expect(data.currentStreak).toBe(3)
			expect(data.lastPlayedAt).toBeNull()
		}
	})

	it('returns stats with lastPlayedAt', async () => {
		const db = drizzle(env.DB)
		const lastPlayedAt = new Date('2025-01-01T12:00:00Z')
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values({ discordId: ctx.discordId })
		await db.insert(guildUserStats).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
			rating: 1200,
			peakRating: 1200,
			lastPlayedAt,
		})

		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.$get(
			{
				param: { guildId: ctx.guildId, discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.lastPlayedAt).toBe(lastPlayedAt.toISOString())
		}
	})

	it('returns 404 when guild not found', async () => {
		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.$get(
			{
				param: { guildId: ctx.guildId, discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Guild not found')
		}
	})

	it('returns 404 when stats not found', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.$get(
			{
				param: { guildId: ctx.guildId, discordId: 'nonexistent' },
			},
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Stats not found')
		}
	})
})
