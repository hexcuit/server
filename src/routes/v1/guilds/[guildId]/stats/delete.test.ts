import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { env } from '@test/setup'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { beforeEach, describe, expect, it } from 'vitest'

import { guildMatches, guilds, guildUserMatchHistory, guildUserStats, users } from '@/db/schema'

import { typedApp } from './delete'

describe('DELETE /v1/guilds/:guildId/stats', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('deletes all stats in guild', async () => {
		const db = drizzle(env.DB)
		await db.insert(users).values([{ discordId: ctx.discordId }, { discordId: ctx.discordId2 }])
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(guildUserStats).values([
			{
				guildId: ctx.guildId,
				discordId: ctx.discordId,
				rating: 1200,
				peakRating: 1200,
			},
			{
				guildId: ctx.guildId,
				discordId: ctx.discordId2,
				rating: 1300,
				peakRating: 1300,
			},
		])

		const res = await client.v1.guilds[':guildId'].stats.$delete(
			{ param: { guildId: ctx.guildId } },
			authHeaders,
		)

		expect(res.status).toBe(204)

		// Verify all stats were deleted
		const stats = await db
			.select()
			.from(guildUserStats)
			.where(eq(guildUserStats.guildId, ctx.guildId))
			.all()
		expect(stats).toHaveLength(0)
	})

	it('deletes all stats and match history in guild', async () => {
		const db = drizzle(env.DB)
		const matchId = ctx.generateMatchId()

		await db.insert(users).values([{ discordId: ctx.discordId }, { discordId: ctx.discordId2 }])
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(guildUserStats).values([
			{
				guildId: ctx.guildId,
				discordId: ctx.discordId,
				rating: 1200,
				peakRating: 1200,
			},
			{
				guildId: ctx.guildId,
				discordId: ctx.discordId2,
				rating: 1300,
				peakRating: 1300,
			},
		])
		await db.insert(guildMatches).values({
			id: matchId,
			guildId: ctx.guildId,
			channelId: ctx.channelId,
			messageId: ctx.messageId,
			status: 'confirmed',
		})
		await db.insert(guildUserMatchHistory).values([
			{
				guildId: ctx.guildId,
				discordId: ctx.discordId,
				matchId,
				result: 'WIN',
				ratingChange: 15,
				ratingAfter: 1215,
			},
			{
				guildId: ctx.guildId,
				discordId: ctx.discordId2,
				matchId,
				result: 'LOSE',
				ratingChange: -15,
				ratingAfter: 1285,
			},
		])

		const res = await client.v1.guilds[':guildId'].stats.$delete(
			{ param: { guildId: ctx.guildId } },
			authHeaders,
		)

		expect(res.status).toBe(204)

		// Verify all stats were deleted
		const stats = await db
			.select()
			.from(guildUserStats)
			.where(eq(guildUserStats.guildId, ctx.guildId))
			.all()
		expect(stats).toHaveLength(0)

		// Verify all match history was deleted
		const history = await db
			.select()
			.from(guildUserMatchHistory)
			.where(eq(guildUserMatchHistory.guildId, ctx.guildId))
			.all()
		expect(history).toHaveLength(0)
	})

	it('returns 404 when guild not found', async () => {
		const res = await client.v1.guilds[':guildId'].stats.$delete(
			{ param: { guildId: 'nonexistent' } },
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Guild not found')
		}
	})
})
