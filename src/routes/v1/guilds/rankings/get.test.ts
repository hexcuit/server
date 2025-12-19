import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { authHeaders, createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { guildRatings } from '@/db/schema'
import { PLACEMENT_GAMES } from '@/utils/elo'
import { typedApp } from './get'

describe('getRankings', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(async () => {
		ctx = createTestContext()
		const db = drizzle(env.DB)

		await setupTestUsers(db, ctx)
		await db.insert(guildRatings).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
			rating: 1600,
			wins: 10,
			losses: 5,
			placementGames: PLACEMENT_GAMES,
		})
		await db.insert(guildRatings).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId2,
			rating: 1500,
			wins: 8,
			losses: 7,
			placementGames: PLACEMENT_GAMES,
		})
	})

	it('returns rankings sorted by rating', async () => {
		const res = await client.v1.guilds[':guildId'].rankings.$get(
			{ param: { guildId: ctx.guildId }, query: {} },
			authHeaders,
		)

		expect(res.status).toBe(200)

		const data = await res.json()
		expect(data.guildId).toBe(ctx.guildId)
		expect(data.rankings).toHaveLength(2)
		expect(data.rankings[0]?.position).toBe(1)
		expect(data.rankings[0]?.discordId).toBe(ctx.discordId)
		expect(data.rankings[0]?.rating).toBe(1600)
		expect(data.rankings[1]?.position).toBe(2)
		expect(data.rankings[1]?.discordId).toBe(ctx.discordId2)
	})

	it('respects limit parameter', async () => {
		const res = await client.v1.guilds[':guildId'].rankings.$get(
			{
				param: { guildId: ctx.guildId },
				query: { limit: '1' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		const data = await res.json()
		expect(data.rankings).toHaveLength(1)
	})
})
