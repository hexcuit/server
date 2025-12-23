import { beforeEach, describe, expect, it } from 'bun:test'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { guildUserStats } from '@/db/schema'
import { typedApp } from './upsert'

describe('upsertRating', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(async () => {
		ctx = createTestContext()
	})

	it('creates a new rating and returns 201', async () => {
		const res = await client.v1.guilds[':guildId'].ratings.$put(
			{
				param: { guildId: ctx.guildId },
				json: { discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(201)

		if (res.status === 201) {
			const data = await res.json()
			expect(data.created).toBe(true)
			expect(data.rating.discordId).toBe(ctx.discordId)
			expect(data.rating.rating).toBe(1200) // INITIAL_RATING
		}
	})

	it('returns existing rating with 200', async () => {
		const db = drizzle(env.DB)
		await setupTestUsers(db, ctx)
		await db.insert(guildUserStats).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
			rating: 1500,
			wins: 5,
			losses: 3,
			placementGames: 10,
		})

		const res = await client.v1.guilds[':guildId'].ratings.$put(
			{
				param: { guildId: ctx.guildId },
				json: { discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.status === 200) {
			const data = await res.json()
			expect(data.created).toBe(false)
			expect(data.rating.rating).toBe(1500)
		}
	})
})
