import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { authHeaders, createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { lolRanks } from '@/db/schema'
import { typedApp } from './get'

describe('getRanks', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(async () => {
		ctx = createTestContext()
		const db = drizzle(env.DB)
		await setupTestUsers(db, ctx, { withLolRank: true })
	})

	it('returns rank for registered user', async () => {
		const res = await client.v1.ranks.$get({ query: { id: [ctx.discordId] } }, authHeaders)

		expect(res.status).toBe(200)

		const data = await res.json()
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

		const res = await client.v1.ranks.$get({ query: { id: [unrankedId] } }, authHeaders)

		expect(res.status).toBe(200)

		const data = await res.json()
		expect(data.ranks).toHaveLength(1)
		expect(data.ranks[0]).toEqual({
			discordId: unrankedId,
			tier: 'UNRANKED',
			division: null,
		})
	})

	it('returns ranks for multiple users', async () => {
		const db = drizzle(env.DB)

		await db.insert(lolRanks).values({
			discordId: ctx.discordId2,
			tier: 'PLATINUM',
			division: 'I',
		})

		const res = await client.v1.ranks.$get({ query: { id: [ctx.discordId, ctx.discordId2] } }, authHeaders)

		expect(res.status).toBe(200)

		const data = await res.json()
		expect(data.ranks).toHaveLength(2)
	})
})
