import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { env } from '@test/setup'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { beforeEach, describe, expect, it } from 'vitest'

import { guilds, guildUserStats, users } from '@/db/schema'

import { typedApp } from './get'

describe('GET /v1/guilds/:guildId/rankings', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('returns rankings ordered by rating', async () => {
		const db = drizzle(env.DB)
		const user3Id = ctx.generateUserId()
		await db
			.insert(users)
			.values([{ discordId: ctx.discordId }, { discordId: ctx.discordId2 }, { discordId: user3Id }])
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(guildUserStats).values([
			{
				guildId: ctx.guildId,
				discordId: ctx.discordId,
				rating: 1200,
				wins: 5,
				losses: 3,
				peakRating: 1200,
			},
			{
				guildId: ctx.guildId,
				discordId: ctx.discordId2,
				rating: 1400,
				wins: 10,
				losses: 2,
				peakRating: 1400,
			},
			{
				guildId: ctx.guildId,
				discordId: user3Id,
				rating: 1300,
				wins: 7,
				losses: 4,
				peakRating: 1300,
			},
		])

		const res = await client.v1.guilds[':guildId'].rankings.$get(
			{ param: { guildId: ctx.guildId }, query: {} },
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.total).toBe(3)
			expect(data.rankings).toHaveLength(3)
			// Should be ordered by rating descending
			expect(data.rankings.at(0)?.discordId).toBe(ctx.discordId2)
			expect(data.rankings.at(0)?.rating).toBe(1400)
			expect(data.rankings.at(0)?.rank).toBe(1)
			expect(data.rankings.at(1)?.discordId).toBe(user3Id)
			expect(data.rankings.at(1)?.rating).toBe(1300)
			expect(data.rankings.at(1)?.rank).toBe(2)
			expect(data.rankings.at(2)?.discordId).toBe(ctx.discordId)
			expect(data.rankings.at(2)?.rating).toBe(1200)
			expect(data.rankings.at(2)?.rank).toBe(3)
		}
	})

	it('returns paginated rankings with limit and offset', async () => {
		const db = drizzle(env.DB)
		const user3Id = ctx.generateUserId()
		await db
			.insert(users)
			.values([{ discordId: ctx.discordId }, { discordId: ctx.discordId2 }, { discordId: user3Id }])
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
				rating: 1400,
				peakRating: 1400,
			},
			{
				guildId: ctx.guildId,
				discordId: user3Id,
				rating: 1300,
				peakRating: 1300,
			},
		])

		const res = await client.v1.guilds[':guildId'].rankings.$get(
			{ param: { guildId: ctx.guildId }, query: { limit: '2', offset: '1' } },
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.total).toBe(3)
			expect(data.rankings).toHaveLength(2)
			// Starting from offset 1, so rank should be 2 and 3
			expect(data.rankings.at(0)?.rating).toBe(1300)
			expect(data.rankings.at(0)?.rank).toBe(2)
			expect(data.rankings.at(1)?.rating).toBe(1200)
			expect(data.rankings.at(1)?.rank).toBe(3)
		}
	})

	it('returns empty rankings when no stats exist', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].rankings.$get(
			{ param: { guildId: ctx.guildId }, query: {} },
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
