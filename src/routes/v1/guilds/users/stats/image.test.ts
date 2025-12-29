import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, type TestContext } from '@/__tests__/test-utils'
import { guildSettings, guilds, guildUserMatchHistory, guildUserStats, users } from '@/db/schema'

// Mock the stats-card module to avoid WASM loading issues in tests
const PNG_MAGIC_BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
mock.module('@/utils/stats-card', () => ({
	generateStatsCard: async () => PNG_MAGIC_BYTES,
}))

// Import after mocking
const { typedApp } = await import('./image')

describe('GET /v1/guilds/:guildId/users/:discordId/stats/image', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('returns 404 when guild not found', async () => {
		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.image.$get(
			{
				param: { guildId: ctx.guildId, discordId: ctx.discordId },
				query: {},
			},
			authHeaders,
		)

		expect(res.status).toBe(404)

		const data = (await res.json()) as { message: string }
		expect(data.message).toBe('Guild not found')
	})

	it('returns 404 when stats not found', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.image.$get(
			{
				param: { guildId: ctx.guildId, discordId: 'nonexistent' },
				query: {},
			},
			authHeaders,
		)

		expect(res.status).toBe(404)

		const data = (await res.json()) as { message: string }
		expect(data.message).toBe('Stats not found')
	})

	it('returns PNG image when stats exist', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values({ discordId: ctx.discordId })
		await db.insert(guildUserStats).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
			rating: 1350,
			wins: 10,
			losses: 5,
			placementGames: 5,
			peakRating: 1400,
			currentStreak: 3,
		})

		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.image.$get(
			{
				param: { guildId: ctx.guildId, discordId: ctx.discordId },
				query: {},
			},
			authHeaders,
		)

		expect(res.status).toBe(200)
		expect(res.headers.get('content-type')).toBe('image/png')

		// Verify it's a valid PNG (starts with PNG magic bytes)
		const buffer = await res.arrayBuffer()
		const bytes = new Uint8Array(buffer)
		// PNG signature: 137 80 78 71 13 10 26 10
		expect(bytes[0]).toBe(137)
		expect(bytes[1]).toBe(80) // 'P'
		expect(bytes[2]).toBe(78) // 'N'
		expect(bytes[3]).toBe(71) // 'G'
	})

	it('returns image with custom displayName and avatarUrl', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values({ discordId: ctx.discordId })
		await db.insert(guildUserStats).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
			rating: 1200,
			peakRating: 1200,
		})

		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.image.$get(
			{
				param: { guildId: ctx.guildId, discordId: ctx.discordId },
				query: {
					displayName: 'TestPlayer',
					avatarUrl: 'https://cdn.discordapp.com/embed/avatars/1.png',
				},
			},
			authHeaders,
		)

		expect(res.status).toBe(200)
		expect(res.headers.get('content-type')).toBe('image/png')
	})

	it('includes match history in image', async () => {
		const db = drizzle(env.DB)
		const matchId = crypto.randomUUID()
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values({ discordId: ctx.discordId })
		await db.insert(guildUserStats).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
			rating: 1350,
			wins: 3,
			losses: 1,
			placementGames: 4,
			peakRating: 1350,
		})
		await db.insert(guildUserMatchHistory).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
			matchId,
			result: 'WIN',
			ratingChange: 32,
			ratingAfter: 1350,
		})

		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.image.$get(
			{
				param: { guildId: ctx.guildId, discordId: ctx.discordId },
				query: {},
			},
			authHeaders,
		)

		expect(res.status).toBe(200)
		expect(res.headers.get('content-type')).toBe('image/png')
	})

	it('respects placement games setting', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(guildSettings).values({
			guildId: ctx.guildId,
			placementGamesRequired: 10,
		})
		await db.insert(users).values({ discordId: ctx.discordId })
		await db.insert(guildUserStats).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
			rating: 1200,
			placementGames: 5,
			peakRating: 1200,
		})

		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.image.$get(
			{
				param: { guildId: ctx.guildId, discordId: ctx.discordId },
				query: {},
			},
			authHeaders,
		)

		expect(res.status).toBe(200)
		expect(res.headers.get('content-type')).toBe('image/png')
	})
})
