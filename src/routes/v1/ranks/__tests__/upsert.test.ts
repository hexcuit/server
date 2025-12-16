import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'
import { lolRank, users } from '@/db/schema'
import { app } from '@/index'

describe('PUT /v1/ranks/{discordId}', () => {
	const testDiscordId = 'test-user-123'
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
		await db.delete(lolRank).where(eq(lolRank.discordId, testDiscordId))
		await db.delete(users).where(eq(users.discordId, testDiscordId))
	})

	it('returns 201 when creating a new rank', async () => {
		const res = await app.request(
			`/v1/ranks/${testDiscordId}`,
			{
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': apiKey,
				},
				body: JSON.stringify({
					tier: 'GOLD',
					division: 'II',
				}),
			},
			env,
		)

		expect(res.status).toBe(201)

		const data = (await res.json()) as { rank: { discordId: string; tier: string; division: string } }
		expect(data).toHaveProperty('rank')
		expect(data.rank).toEqual({
			discordId: testDiscordId,
			tier: 'GOLD',
			division: 'II',
		})

		const db = drizzle(env.DB)
		const saved = await db.select().from(lolRank).where(eq(lolRank.discordId, testDiscordId)).get()

		expect(saved).toBeDefined()
		expect(saved?.tier).toBe('GOLD')
		expect(saved?.division).toBe('II')
	})

	it('returns 200 when updating an existing rank', async () => {
		const db = drizzle(env.DB)

		await db.insert(users).values({ discordId: testDiscordId })
		await db.insert(lolRank).values({
			discordId: testDiscordId,
			tier: 'SILVER',
			division: 'I',
		})

		const res = await app.request(
			`/v1/ranks/${testDiscordId}`,
			{
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': apiKey,
				},
				body: JSON.stringify({
					tier: 'PLATINUM',
					division: 'IV',
				}),
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as { rank: { discordId: string; tier: string; division: string } }
		expect(data.rank).toEqual({
			discordId: testDiscordId,
			tier: 'PLATINUM',
			division: 'IV',
		})

		const updated = await db.select().from(lolRank).where(eq(lolRank.discordId, testDiscordId)).get()
		expect(updated?.tier).toBe('PLATINUM')
		expect(updated?.division).toBe('IV')
	})

	it('returns 401 without API key', async () => {
		const res = await app.request(
			`/v1/ranks/${testDiscordId}`,
			{
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					tier: 'GOLD',
					division: 'II',
				}),
			},
			env,
		)

		expect(res.status).toBe(401)
	})

	it('returns 401 with invalid API key', async () => {
		const res = await app.request(
			`/v1/ranks/${testDiscordId}`,
			{
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': 'invalid-key',
				},
				body: JSON.stringify({
					tier: 'GOLD',
					division: 'II',
				}),
			},
			env,
		)

		expect(res.status).toBe(401)
	})

	it('returns 400 on validation error', async () => {
		const res = await app.request(
			`/v1/ranks/${testDiscordId}`,
			{
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': apiKey,
				},
				body: JSON.stringify({}),
			},
			env,
		)

		expect(res.status).toBe(400)
	})
})
