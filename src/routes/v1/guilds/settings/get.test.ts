import { beforeEach, describe, expect, it } from 'bun:test'
import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { env } from '@test/setup'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
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

		const res = await client.v1.guilds[':guildId'].settings.$get({ param: { guildId: ctx.guildId } }, authHeaders)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.initialRating).toBe(1200)
			expect(data.kFactor).toBe(32)
			expect(data.kFactorPlacement).toBe(64)
			expect(data.placementGamesRequired).toBe(5)
		}
	})

	it('returns 404 when guild not found', async () => {
		const res = await client.v1.guilds[':guildId'].settings.$get({ param: { guildId: 'nonexistent' } }, authHeaders)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Guild not found')
		}
	})
})
