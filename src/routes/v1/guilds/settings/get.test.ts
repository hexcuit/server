import { beforeEach, describe, expect, it } from 'bun:test'
import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { env } from '@test/setup'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { INITIAL_RATING, K_FACTOR_NORMAL, PLACEMENT_GAMES } from '@/constants/rating'
import { guilds } from '@/db/schema'
import { typedApp } from './get'

describe('GET /v1/guilds/:guildId/settings', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('returns default settings for new guild', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].settings.$get(
			{
				param: { guildId: ctx.guildId },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.initialRating).toBe(INITIAL_RATING)
			expect(data.kFactor).toBe(K_FACTOR_NORMAL)
			expect(data.placementGamesRequired).toBe(PLACEMENT_GAMES)
		}
	})

	it('returns 404 when guild not found', async () => {
		const res = await client.v1.guilds[':guildId'].settings.$get(
			{
				param: { guildId: ctx.guildId },
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
