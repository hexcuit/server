import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { env } from '@test/setup'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { guilds, guildUserStats, users } from '@/db/schema'

import { typedApp } from './get'

// Mock generateStatsCard
vi.mock('@/utils/stats-card', () => ({
	generateStatsCard: vi.fn().mockResolvedValue(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), // PNG header
}))

// Mock fetch for avatar
vi.stubGlobal(
	'fetch',
	vi.fn().mockResolvedValue({
		ok: true,
		arrayBuffer: () => Promise.resolve(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer),
		headers: new Headers({ 'content-type': 'image/png' }),
	}),
)

describe('GET /v1/guilds/:guildId/users/:discordId/stats/image', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
		vi.clearAllMocks()
	})

	it('returns stats card image', async () => {
		const db = drizzle(env.DB)
		await db.insert(users).values({ discordId: ctx.discordId })
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(guildUserStats).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
			rating: 1200,
			wins: 5,
			losses: 3,
			placementGames: 10,
			peakRating: 1250,
			currentStreak: 2,
		})

		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.image.$get(
			{ param: { guildId: ctx.guildId, discordId: ctx.discordId }, query: {} },
			authHeaders,
		)

		expect(res.status).toBe(200)
		expect(res.headers.get('content-type')).toBe('image/png')
	})

	it('returns stats card with displayName and avatarUrl', async () => {
		const db = drizzle(env.DB)
		await db.insert(users).values({ discordId: ctx.discordId })
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(guildUserStats).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
			rating: 1200,
			wins: 5,
			losses: 3,
			placementGames: 10,
			peakRating: 1250,
		})

		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.image.$get(
			{
				param: { guildId: ctx.guildId, discordId: ctx.discordId },
				query: {
					displayName: 'TestUser',
					avatarUrl: 'https://example.com/avatar.png',
				},
			},
			authHeaders,
		)

		expect(res.status).toBe(200)
		expect(res.headers.get('content-type')).toBe('image/png')
	})

	it('returns 404 when guild not found', async () => {
		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.image.$get(
			{ param: { guildId: 'nonexistent', discordId: ctx.discordId }, query: {} },
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			if ('message' in data) {
				expect(data.message).toBe('Guild not found')
			}
		}
	})

	it('returns 404 when stats not found', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.image.$get(
			{ param: { guildId: ctx.guildId, discordId: 'nonexistent' }, query: {} },
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			if ('message' in data) {
				expect(data.message).toBe('Stats not found')
			}
		}
	})

	it('returns stats card for placement player', async () => {
		const db = drizzle(env.DB)
		await db.insert(users).values({ discordId: ctx.discordId })
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(guildUserStats).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
			rating: 1000,
			wins: 2,
			losses: 1,
			placementGames: 3, // Still in placement
			peakRating: 1000,
		})

		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.image.$get(
			{ param: { guildId: ctx.guildId, discordId: ctx.discordId }, query: {} },
			authHeaders,
		)

		expect(res.status).toBe(200)
		expect(res.headers.get('content-type')).toBe('image/png')
	})
})
