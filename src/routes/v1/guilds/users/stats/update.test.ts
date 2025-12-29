import { beforeEach, describe, expect, it } from 'bun:test'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, type TestContext } from '@/__tests__/test-utils'
import { guilds, guildUserStats, users } from '@/db/schema'
import { typedApp } from './update'

describe('PATCH /v1/guilds/:guildId/users/:discordId/stats', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('updates user stats', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values({ discordId: ctx.discordId })
		await db.insert(guildUserStats).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
			rating: 1200,
			peakRating: 1200,
		})

		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.$patch(
			{
				param: { guildId: ctx.guildId, discordId: ctx.discordId },
				json: { rating: 1500, wins: 10 },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.discordId).toBe(ctx.discordId)
			expect(data.rating).toBe(1500)
			expect(data.wins).toBe(10)
			expect(data.updatedAt).toBeDefined()
		}
	})

	it('returns 404 when stats not found', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.$patch(
			{
				param: { guildId: ctx.guildId, discordId: 'nonexistent' },
				json: { rating: 1500 },
			},
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Stats not found')
		}
	})
})
