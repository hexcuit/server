import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'
import { guildRatings, users } from '@/db/schema'
import { app } from '@/index'
import { PLACEMENT_GAMES } from '@/utils/elo'

describe('GET /v1/guilds/{guildId}/rankings', () => {
	const testDiscordId = 'test-user-123'
	const testDiscordId2 = 'test-user-456'
	const testGuildId = 'test-guild-123'
	const apiKey = 'test-api-key'

	let env: { DB: D1Database; API_KEY: string }
	let dispose: () => Promise<void>

	beforeAll(async () => {
		const proxy = await getPlatformProxy<{ DB: D1Database; API_KEY: string }>({
			configPath: './wrangler.jsonc',
		})
		env = { ...proxy.env, API_KEY: apiKey }
		dispose = proxy.dispose
	})

	afterAll(async () => {
		await dispose()
	})

	beforeEach(async () => {
		const db = drizzle(env.DB)
		await db
			.delete(guildRatings)
			.where(and(eq(guildRatings.guildId, testGuildId), eq(guildRatings.discordId, testDiscordId)))
		await db
			.delete(guildRatings)
			.where(and(eq(guildRatings.guildId, testGuildId), eq(guildRatings.discordId, testDiscordId2)))
		await db.delete(users).where(eq(users.discordId, testDiscordId))
		await db.delete(users).where(eq(users.discordId, testDiscordId2))

		await db.insert(users).values({ discordId: testDiscordId })
		await db.insert(users).values({ discordId: testDiscordId2 })
		await db.insert(guildRatings).values({
			guildId: testGuildId,
			discordId: testDiscordId,
			rating: 1600,
			wins: 10,
			losses: 5,
			placementGames: PLACEMENT_GAMES,
		})
		await db.insert(guildRatings).values({
			guildId: testGuildId,
			discordId: testDiscordId2,
			rating: 1500,
			wins: 8,
			losses: 7,
			placementGames: PLACEMENT_GAMES,
		})
	})

	it('returns rankings sorted by rating', async () => {
		const res = await app.request(
			`/v1/guilds/${testGuildId}/rankings`,
			{
				method: 'GET',
				headers: {
					'x-api-key': apiKey,
				},
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as {
			guildId: string
			rankings: Array<{ position: number; discordId: string; rating: number }>
		}
		expect(data.guildId).toBe(testGuildId)
		expect(data.rankings).toHaveLength(2)
		expect(data.rankings[0]?.position).toBe(1)
		expect(data.rankings[0]?.discordId).toBe(testDiscordId)
		expect(data.rankings[0]?.rating).toBe(1600)
		expect(data.rankings[1]?.position).toBe(2)
		expect(data.rankings[1]?.discordId).toBe(testDiscordId2)
	})

	it('respects limit parameter', async () => {
		const res = await app.request(
			`/v1/guilds/${testGuildId}/rankings?limit=1`,
			{
				method: 'GET',
				headers: {
					'x-api-key': apiKey,
				},
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as {
			rankings: Array<{ position: number; discordId: string }>
		}
		expect(data.rankings).toHaveLength(1)
	})

	it('returns 401 without API key', async () => {
		const res = await app.request(
			`/v1/guilds/${testGuildId}/rankings`,
			{
				method: 'GET',
			},
			env,
		)

		expect(res.status).toBe(401)
	})
})
