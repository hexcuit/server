import { beforeEach, describe, expect, it } from 'bun:test'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, seedLolRank, type TestContext } from '@/__tests__/test-utils'
import { typedApp } from './upsert'

describe('upsertRank', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(async () => {
		ctx = createTestContext()
	})

	it('creates a new rank with division', async () => {
		const res = await client.v1.ranks[':discordId'].$put(
			{
				param: { discordId: ctx.discordId },
				json: { tier: 'GOLD', division: 'II' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		const data = await res.json()
		expect(data.rank.discordId).toBe(ctx.discordId)
		expect(data.rank.tier).toBe('GOLD')
		expect(data.rank.division).toBe('II')
		expect(data.rank.createdAt).toBeDefined()
		expect(data.rank.updatedAt).toBeDefined()
	})

	it('creates a new rank without division (MASTER+)', async () => {
		const res = await client.v1.ranks[':discordId'].$put(
			{
				param: { discordId: ctx.discordId },
				json: { tier: 'MASTER' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		const data = await res.json()
		expect(data.rank.discordId).toBe(ctx.discordId)
		expect(data.rank.tier).toBe('MASTER')
		expect(data.rank.division).toBeNull()
	})

	it('updates an existing rank', async () => {
		await seedLolRank(ctx.discordId, { tier: 'SILVER', division: 'I' })

		const res = await client.v1.ranks[':discordId'].$put(
			{
				param: { discordId: ctx.discordId },
				json: { tier: 'PLATINUM', division: 'IV' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		const data = await res.json()
		expect(data.rank.discordId).toBe(ctx.discordId)
		expect(data.rank.tier).toBe('PLATINUM')
		expect(data.rank.division).toBe('IV')
	})

	it('updates division to null when promoting to MASTER+', async () => {
		await seedLolRank(ctx.discordId, { tier: 'DIAMOND', division: 'I' })

		const res = await client.v1.ranks[':discordId'].$put(
			{
				param: { discordId: ctx.discordId },
				json: { tier: 'GRANDMASTER' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		const data = await res.json()
		expect(data.rank.tier).toBe('GRANDMASTER')
		expect(data.rank.division).toBeNull()
	})
})
