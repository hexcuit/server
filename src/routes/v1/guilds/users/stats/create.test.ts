import { beforeEach, describe, expect, it } from 'bun:test'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, type TestContext } from '@/__tests__/test-utils'
import { INITIAL_RATING } from '@/constants/rating'
import { guildSettings, guilds, guildUserStats, users } from '@/db/schema'
import { typedApp } from './create'

describe('POST /v1/guilds/:guildId/users/:discordId/stats', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('creates stats with default initial rating', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values({ discordId: ctx.discordId })

		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.$post(
			{
				param: { guildId: ctx.guildId, discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(201)

		if (res.ok) {
			const data = await res.json()
			expect(data.discordId).toBe(ctx.discordId)
			expect(data.rating).toBe(INITIAL_RATING)
			expect(data.wins).toBe(0)
			expect(data.losses).toBe(0)
			expect(data.placementGames).toBe(0)
			expect(data.peakRating).toBe(INITIAL_RATING)
			expect(data.currentStreak).toBe(0)
		}
	})

	it('creates stats with custom initial rating from guild settings', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(guildSettings).values({ guildId: ctx.guildId, initialRating: 1500 })
		await db.insert(users).values({ discordId: ctx.discordId })

		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.$post(
			{
				param: { guildId: ctx.guildId, discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(201)

		if (res.ok) {
			const data = await res.json()
			expect(data.rating).toBe(1500)
			expect(data.peakRating).toBe(1500)
		}
	})

	it('returns 404 when guild not found', async () => {
		const db = drizzle(env.DB)
		await db.insert(users).values({ discordId: ctx.discordId })

		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.$post(
			{
				param: { guildId: 'nonexistent', discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Guild not found')
		}
	})

	it('returns 404 when user not found', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.$post(
			{
				param: { guildId: ctx.guildId, discordId: 'nonexistent' },
			},
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('User not found')
		}
	})

	it('returns 409 when stats already exist', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values({ discordId: ctx.discordId })
		await db.insert(guildUserStats).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
			rating: 1200,
			peakRating: 1200,
		})

		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.$post(
			{
				param: { guildId: ctx.guildId, discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(409)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Stats already exist')
		}
	})
})
