import { beforeEach, describe, expect, it } from 'bun:test'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, seedLolRank, type TestContext } from '@/__tests__/test-utils'
import { typedApp } from './get'

describe('getRanks', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(async () => {
		ctx = createTestContext()
	})

	it('returns rank for registered user', async () => {
		await seedLolRank(ctx.discordId, { tier: 'DIAMOND', division: 'III' })

		const res = await client.v1.ranks.$get({ query: { id: [ctx.discordId] } }, authHeaders)

		expect(res.status).toBe(200)

		const data = await res.json()
		expect(data.ranks).toHaveLength(1)
		expect(data.ranks[0]?.discordId).toBe(ctx.discordId)
		expect(data.ranks[0]?.tier).toBe('DIAMOND')
		expect(data.ranks[0]?.division).toBe('III')
	})

	it('returns empty array for unregistered user', async () => {
		const unrankedId = `unranked-${ctx.prefix}`

		const res = await client.v1.ranks.$get({ query: { id: [unrankedId] } }, authHeaders)

		expect(res.status).toBe(200)

		const data = await res.json()
		expect(data.ranks).toHaveLength(0)
	})

	it('returns ranks for multiple users', async () => {
		await seedLolRank(ctx.discordId, { tier: 'DIAMOND', division: 'III' })
		await seedLolRank(ctx.discordId2, { tier: 'PLATINUM', division: 'I' })

		const res = await client.v1.ranks.$get({ query: { id: [ctx.discordId, ctx.discordId2] } }, authHeaders)

		expect(res.status).toBe(200)

		const data = await res.json()
		expect(data.ranks).toHaveLength(2)
	})

	it('returns only registered users when mixed', async () => {
		await seedLolRank(ctx.discordId, { tier: 'GOLD', division: 'II' })
		const unrankedId = `unranked-${ctx.prefix}`

		const res = await client.v1.ranks.$get({ query: { id: [ctx.discordId, unrankedId] } }, authHeaders)

		expect(res.status).toBe(200)

		const data = await res.json()
		expect(data.ranks).toHaveLength(1)
		expect(data.ranks[0]?.discordId).toBe(ctx.discordId)
	})
})
