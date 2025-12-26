import { beforeEach, describe, expect, it } from 'bun:test'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, type TestContext } from '@/__tests__/test-utils'
import { guilds } from '@/db/schema'
import { typedApp } from './update'

describe('PATCH /v1/guilds/:guildId/settings', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('updates guild settings', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].settings.$patch(
			{
				param: { guildId: ctx.guildId },
				json: { initialRating: 1500, kFactor: 40 },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.initialRating).toBe(1500)
			expect(data.kFactor).toBe(40)
			expect(data.updatedAt).toBeDefined()
		}
	})

	it('creates settings if not exists', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].settings.$patch(
			{
				param: { guildId: ctx.guildId },
				json: { placementGamesRequired: 10 },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.placementGamesRequired).toBe(10)
		}
	})

	it('returns 404 when guild not found', async () => {
		const res = await client.v1.guilds[':guildId'].settings.$patch(
			{
				param: { guildId: 'nonexistent' },
				json: { initialRating: 1500 },
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
