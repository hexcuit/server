import { beforeEach, describe, expect, it } from 'bun:test'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, seedRank, seedUser, type TestContext } from '@/__tests__/test-utils'
import { typedApp } from './upsert'

describe('PUT /v1/users/:discordId/rank', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('creates a new rank with division', async () => {
		await seedUser(ctx.discordId)

		const res = await client.v1.users[':discordId'].rank.$put(
			{
				param: { discordId: ctx.discordId },
				json: { tier: 'GOLD', division: 'II' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.tier).toBe('GOLD')
			expect(data.division).toBe('II')
			expect(data.updatedAt).toBeDefined()
		}
	})

	it('creates a new rank without division (MASTER+)', async () => {
		await seedUser(ctx.discordId)

		const res = await client.v1.users[':discordId'].rank.$put(
			{
				param: { discordId: ctx.discordId },
				json: { tier: 'MASTER', division: null },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.tier).toBe('MASTER')
			expect(data.division).toBeNull()
		}
	})

	it('updates an existing rank', async () => {
		await seedRank(ctx.discordId, { tier: 'SILVER', division: 'I' })

		const res = await client.v1.users[':discordId'].rank.$put(
			{
				param: { discordId: ctx.discordId },
				json: { tier: 'PLATINUM', division: 'IV' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.tier).toBe('PLATINUM')
			expect(data.division).toBe('IV')
		}
	})
})
