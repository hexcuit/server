import { beforeEach, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, type TestContext } from '@/__tests__/test-utils'
import { guilds, guildUserStats, users } from '@/db/schema'
import { typedApp } from './delete'

describe('DELETE /v1/guilds/:guildId/stats', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('deletes all user stats in guild', async () => {
		const db = drizzle(env.DB)
		const user1 = `${ctx.discordId}-1`
		const user2 = `${ctx.discordId}-2`
		const user3 = `${ctx.discordId}-3`

		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values([{ discordId: user1 }, { discordId: user2 }, { discordId: user3 }])
		await db.insert(guildUserStats).values([
			{ guildId: ctx.guildId, discordId: user1, rating: 1200, peakRating: 1200 },
			{ guildId: ctx.guildId, discordId: user2, rating: 1300, peakRating: 1350 },
			{ guildId: ctx.guildId, discordId: user3, rating: 1100, peakRating: 1200 },
		])

		const res = await client.v1.guilds[':guildId'].stats.$delete(
			{
				param: { guildId: ctx.guildId },
			},
			authHeaders,
		)

		expect(res.status).toBe(204)

		// Verify all stats deleted
		const stats = await db.select().from(guildUserStats).where(eq(guildUserStats.guildId, ctx.guildId))

		expect(stats).toHaveLength(0)
	})

	it('does not affect other guilds', async () => {
		const db = drizzle(env.DB)
		const otherGuildId = `${ctx.guildId}-other`
		const user1 = `${ctx.discordId}-1`
		const user2 = `${ctx.discordId}-2`

		await db.insert(guilds).values([{ guildId: ctx.guildId }, { guildId: otherGuildId }])
		await db.insert(users).values([{ discordId: user1 }, { discordId: user2 }])
		await db.insert(guildUserStats).values([
			{ guildId: ctx.guildId, discordId: user1, rating: 1200, peakRating: 1200 },
			{ guildId: otherGuildId, discordId: user2, rating: 1300, peakRating: 1300 },
		])

		const res = await client.v1.guilds[':guildId'].stats.$delete(
			{
				param: { guildId: ctx.guildId },
			},
			authHeaders,
		)

		expect(res.status).toBe(204)

		// Verify target guild stats deleted
		const targetStats = await db.select().from(guildUserStats).where(eq(guildUserStats.guildId, ctx.guildId))

		expect(targetStats).toHaveLength(0)

		// Verify other guild stats preserved
		const otherStats = await db.select().from(guildUserStats).where(eq(guildUserStats.guildId, otherGuildId))

		expect(otherStats).toHaveLength(1)
	})

	it('returns 204 when no stats exist', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].stats.$delete(
			{
				param: { guildId: ctx.guildId },
			},
			authHeaders,
		)

		expect(res.status).toBe(204)
	})

	it('returns 404 when guild not found', async () => {
		const res = await client.v1.guilds[':guildId'].stats.$delete(
			{
				param: { guildId: 'nonexistent' },
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
