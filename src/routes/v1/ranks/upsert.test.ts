import { env } from 'cloudflare:test'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { authHeaders, createTestContext, type TestContext } from '@/__tests__/test-utils'
import { lolRanks, users } from '@/db/schema'
import { typedApp } from './upsert'

describe('upsertRank', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(async () => {
		ctx = createTestContext()
	})

	it('creates a new rank', async () => {
		const res = await client.v1.ranks[':discordId'].$put(
			{
				param: { discordId: ctx.discordId },
				json: { tier: 'GOLD', division: 'II' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		const data = await res.json()
		expect(data).toHaveProperty('rank')
		expect(data.rank).toEqual({
			discordId: ctx.discordId,
			tier: 'GOLD',
			division: 'II',
		})

		const db = drizzle(env.DB)
		const saved = await db.select().from(lolRanks).where(eq(lolRanks.discordId, ctx.discordId)).get()

		expect(saved).toBeDefined()
		expect(saved?.tier).toBe('GOLD')
		expect(saved?.division).toBe('II')
	})

	it('updates an existing rank', async () => {
		const db = drizzle(env.DB)

		await db.insert(users).values({ discordId: ctx.discordId })
		await db.insert(lolRanks).values({
			discordId: ctx.discordId,
			tier: 'SILVER',
			division: 'I',
		})

		const res = await client.v1.ranks[':discordId'].$put(
			{
				param: { discordId: ctx.discordId },
				json: { tier: 'PLATINUM', division: 'IV' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		const data = await res.json()
		expect(data.rank).toEqual({
			discordId: ctx.discordId,
			tier: 'PLATINUM',
			division: 'IV',
		})

		const updated = await db.select().from(lolRanks).where(eq(lolRanks.discordId, ctx.discordId)).get()
		expect(updated?.tier).toBe('PLATINUM')
		expect(updated?.division).toBe('IV')
	})
})
