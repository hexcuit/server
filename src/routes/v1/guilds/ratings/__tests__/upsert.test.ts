import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'
import { guildRatings, users } from '@/db/schema'
import { app } from '@/index'

describe('PUT /v1/guilds/{guildId}/ratings', () => {
	const testDiscordId = 'test-user-123'
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
		await db.delete(users).where(eq(users.discordId, testDiscordId))
	})

	it('creates a new rating and returns 201', async () => {
		const res = await app.request(
			`/v1/guilds/${testGuildId}/ratings`,
			{
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': apiKey,
				},
				body: JSON.stringify({
					discordId: testDiscordId,
				}),
			},
			env,
		)

		expect(res.status).toBe(201)

		const data = (await res.json()) as { created: boolean; rating: { discordId: string; rating: number } }
		expect(data.created).toBe(true)
		expect(data.rating.discordId).toBe(testDiscordId)
		expect(data.rating.rating).toBe(1200) // INITIAL_RATING
	})

	it('returns existing rating with 200', async () => {
		const db = drizzle(env.DB)
		await db.insert(users).values({ discordId: testDiscordId })
		await db.insert(guildRatings).values({
			guildId: testGuildId,
			discordId: testDiscordId,
			rating: 1500,
			wins: 5,
			losses: 3,
			placementGames: 10,
		})

		const res = await app.request(
			`/v1/guilds/${testGuildId}/ratings`,
			{
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': apiKey,
				},
				body: JSON.stringify({
					discordId: testDiscordId,
				}),
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as { created: boolean; rating: { discordId: string; rating: number } }
		expect(data.created).toBe(false)
		expect(data.rating.rating).toBe(1500)
	})

	it('returns 401 without API key', async () => {
		const res = await app.request(
			`/v1/guilds/${testGuildId}/ratings`,
			{
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					discordId: testDiscordId,
				}),
			},
			env,
		)

		expect(res.status).toBe(401)
	})
})
