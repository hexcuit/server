import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { lolRanks } from '@/db/schema'
import { app } from '@/index'

describe('GET /v1/ranks', () => {
	let ctx: TestContext

	beforeEach(async () => {
		ctx = createTestContext()
		const db = drizzle(env.DB)
		await setupTestUsers(db, ctx, { withLolRank: true })
	})

	it('returns rank for registered user', async () => {
		const res = await app.request(
			`/v1/ranks?id=${ctx.discordId}`,
			{
				method: 'GET',
				headers: {
					'x-api-key': env.API_KEY,
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
			discordId: ctx.discordId,
			tier: 'DIAMOND',
			division: 'III',
		})
	})

	it('returns UNRANKED for unregistered user', async () => {
		const unrankedId = `unranked-${ctx.prefix}`

		const res = await app.request(
			`/v1/ranks?id=${unrankedId}`,
			{
				method: 'GET',
				headers: {
					'x-api-key': env.API_KEY,
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

		// Setup second user with rank
		await db.insert(lolRanks).values({
			discordId: ctx.discordId2,
			tier: 'PLATINUM',
			division: 'I',
		})

		const res = await app.request(
			`/v1/ranks?id=${ctx.discordId}&id=${ctx.discordId2}`,
			{
				method: 'GET',
				headers: {
					'x-api-key': env.API_KEY,
				},
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as {
			ranks: Array<{ discordId: string; tier: string; division: string }>
		}
		expect(data.ranks).toHaveLength(2)
	})

	it('returns 401 without API key', async () => {
		const res = await app.request(
			`/v1/ranks?id=${ctx.discordId}`,
			{
				method: 'GET',
			},
			env,
		)

		expect(res.status).toBe(401)
	})
})
