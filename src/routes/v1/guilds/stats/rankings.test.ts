import { beforeEach, describe, expect, it } from 'bun:test'
import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { env } from '@test/setup'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { guilds, guildUserStats, users } from '@/db/schema'
import { typedApp } from './rankings'

describe('GET /v1/guilds/:guildId/rankings', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('returns rankings ordered by rating', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values([{ discordId: ctx.discordId }, { discordId: ctx.discordId2 }])
		await db.insert(guildUserStats).values([
			{ guildId: ctx.guildId, discordId: ctx.discordId, rating: 1200 },
			{ guildId: ctx.guildId, discordId: ctx.discordId2, rating: 1400 },
		])

		const res = await client.v1.guilds[':guildId'].rankings.$get(
			{ param: { guildId: ctx.guildId }, query: {} },
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.rankings.length).toBe(2)
			expect(data.rankings[0].discordId).toBe(ctx.discordId2)
			expect(data.rankings[0].rating).toBe(1400)
			expect(data.rankings[0].rank).toBe(1)
			expect(data.rankings[1].discordId).toBe(ctx.discordId)
			expect(data.rankings[1].rating).toBe(1200)
			expect(data.rankings[1].rank).toBe(2)
			expect(data.total).toBe(2)
		}
	})

	it('returns empty rankings for guild with no stats', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].rankings.$get(
			{ param: { guildId: ctx.guildId }, query: {} },
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.rankings.length).toBe(0)
			expect(data.total).toBe(0)
		}
	})

	it('returns 404 when guild not found', async () => {
		const res = await client.v1.guilds[':guildId'].rankings.$get(
			{ param: { guildId: 'nonexistent' }, query: {} },
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Guild not found')
		}
	})
})
