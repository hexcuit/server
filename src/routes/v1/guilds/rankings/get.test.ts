import { beforeEach, describe, expect, it } from 'bun:test'
import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { env } from '@test/setup'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { guilds, guildUserStats, users } from '@/db/schema'
import { typedApp } from './get'

describe('GET /v1/guilds/:guildId/rankings', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('returns rankings sorted by rating', async () => {
		const db = drizzle(env.DB)
		const user1 = `${ctx.discordId}_1`
		const user2 = `${ctx.discordId}_2`
		const user3 = `${ctx.discordId}_3`
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values([{ discordId: user1 }, { discordId: user2 }, { discordId: user3 }])
		await db.insert(guildUserStats).values([
			{ guildId: ctx.guildId, discordId: user1, rating: 1200, peakRating: 1200, wins: 5, losses: 3 },
			{ guildId: ctx.guildId, discordId: user2, rating: 1500, peakRating: 1500, wins: 20, losses: 5 },
			{ guildId: ctx.guildId, discordId: user3, rating: 1350, peakRating: 1400, wins: 10, losses: 8 },
		])

		const res = await client.v1.guilds[':guildId'].rankings.$get(
			{
				param: { guildId: ctx.guildId },
				query: {},
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.total).toBe(3)
			expect(data.rankings).toHaveLength(3)
			expect(data.rankings[0]?.rank).toBe(1)
			expect(data.rankings[0]?.discordId).toBe(user2)
			expect(data.rankings[0]?.rating).toBe(1500)
			expect(data.rankings[1]?.rank).toBe(2)
			expect(data.rankings[1]?.discordId).toBe(user3)
			expect(data.rankings[2]?.rank).toBe(3)
			expect(data.rankings[2]?.discordId).toBe(user1)
		}
	})

	it('supports pagination with limit and offset', async () => {
		const db = drizzle(env.DB)
		const user1 = `${ctx.discordId}_a`
		const user2 = `${ctx.discordId}_b`
		const user3 = `${ctx.discordId}_c`
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values([{ discordId: user1 }, { discordId: user2 }, { discordId: user3 }])
		await db.insert(guildUserStats).values([
			{ guildId: ctx.guildId, discordId: user1, rating: 1200, peakRating: 1200 },
			{ guildId: ctx.guildId, discordId: user2, rating: 1500, peakRating: 1500 },
			{ guildId: ctx.guildId, discordId: user3, rating: 1350, peakRating: 1350 },
		])

		const res = await client.v1.guilds[':guildId'].rankings.$get(
			{
				param: { guildId: ctx.guildId },
				query: { limit: 1, offset: 1 },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.total).toBe(3)
			expect(data.rankings).toHaveLength(1)
			expect(data.rankings[0]?.rank).toBe(2)
			expect(data.rankings[0]?.discordId).toBe(user3)
		}
	})

	it('returns empty rankings for guild without stats', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].rankings.$get(
			{
				param: { guildId: ctx.guildId },
				query: {},
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.total).toBe(0)
			expect(data.rankings).toHaveLength(0)
		}
	})

	it('returns 404 when guild not found', async () => {
		const res = await client.v1.guilds[':guildId'].rankings.$get(
			{
				param: { guildId: ctx.guildId },
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
})
