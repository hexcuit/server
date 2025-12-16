import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'
import { lolRank, users } from '@/db/schema'
import { app } from '@/index'

describe('GET /v1/ranks', () => {
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

		await db.insert(users).values({ discordId: testDiscordId })
		await db.insert(lolRank).values({
			discordId: testDiscordId,
			tier: 'DIAMOND',
			division: 'III',
		})
	})

	it('returns rank for registered user', async () => {
		const res = await app.request(
			`/v1/ranks?id=${testDiscordId}`,
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
			ranks: Array<{ discordId: string; tier: string; division: string }>
		}
		expect(data).toHaveProperty('ranks')
		expect(data.ranks).toHaveLength(1)
		expect(data.ranks[0]).toEqual({
			discordId: testDiscordId,
			tier: 'DIAMOND',
			division: 'III',
		})
	})

	it('returns UNRANKED for unregistered user', async () => {
		const unrankedId = 'unranked-user'

		const res = await app.request(
			`/v1/ranks?id=${unrankedId}`,
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
			ranks: Array<{ discordId: string; tier: string; division: string }>
		}
		expect(data.ranks).toHaveLength(1)
		expect(data.ranks[0]).toEqual({
			discordId: unrankedId,
			tier: 'UNRANKED',
			division: '',
		})
	})

	it('returns ranks for multiple users', async () => {
		const db = drizzle(env.DB)

		const user2 = 'test-user-456'
		await db.insert(users).values({ discordId: user2 })
		await db.insert(lolRank).values({
			discordId: user2,
			tier: 'PLATINUM',
			division: 'I',
		})

		const res = await app.request(
			`/v1/ranks?id=${testDiscordId}&id=${user2}`,
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
			ranks: Array<{ discordId: string; tier: string; division: string }>
		}
		expect(data.ranks).toHaveLength(2)

		await db.delete(lolRank).where(eq(lolRank.discordId, user2))
		await db.delete(users).where(eq(users.discordId, user2))
	})

	it('returns 401 without API key', async () => {
		const res = await app.request(
			`/v1/ranks?id=${testDiscordId}`,
			{
				method: 'GET',
			},
			env,
		)

		expect(res.status).toBe(401)
	})
})
