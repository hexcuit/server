import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'
import { guildRatings, users } from '@/db/schema'
import { app } from '@/index'

describe('GET /v1/guilds/{guildId}/ratings', () => {
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
		await db.insert(guildRatings).values({
			guildId: testGuildId,
			discordId: testDiscordId,
			rating: 1500,
			wins: 5,
			losses: 3,
			placementGames: 10,
		})
	})

	it('returns rating for registered user', async () => {
		const res = await app.request(
			`/v1/guilds/${testGuildId}/ratings?id=${testDiscordId}`,
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
			ratings: Array<{ discordId: string; rating: number | null }>
		}
		expect(data.ratings).toHaveLength(1)
		expect(data.ratings[0]?.discordId).toBe(testDiscordId)
		expect(data.ratings[0]?.rating).toBe(1500)
	})

	it('returns null rating for unregistered user', async () => {
		const unregisteredId = 'unregistered-user'

		const res = await app.request(
			`/v1/guilds/${testGuildId}/ratings?id=${unregisteredId}`,
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
			ratings: Array<{ discordId: string; rating: number | null }>
		}
		expect(data.ratings).toHaveLength(1)
		expect(data.ratings[0]?.discordId).toBe(unregisteredId)
		expect(data.ratings[0]?.rating).toBeNull()
	})

	it('returns 401 without API key', async () => {
		const res = await app.request(
			`/v1/guilds/${testGuildId}/ratings?id=${testDiscordId}`,
			{
				method: 'GET',
			},
			env,
		)

		expect(res.status).toBe(401)
	})
})
