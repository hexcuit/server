import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { env } from '@test/setup'
import { testClient } from 'hono/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { typedApp } from './put'

describe('PUT /v1/users/:discordId/rank', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('creates rank and auto-creates user', async () => {
		const res = await client.v1.users[':discordId'].rank.$put(
			{
				param: { discordId: ctx.discordId },
				json: { tier: 'PLATINUM', division: 'II' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.tier).toBe('PLATINUM')
			expect(data.division).toBe('II')
			expect(data.updatedAt).toBeDefined()
		}
	})

	it('updates existing rank', async () => {
		// Create initial rank
		await client.v1.users[':discordId'].rank.$put(
			{
				param: { discordId: ctx.discordId },
				json: { tier: 'GOLD', division: 'IV' },
			},
			authHeaders,
		)

		// Update rank
		const res = await client.v1.users[':discordId'].rank.$put(
			{
				param: { discordId: ctx.discordId },
				json: { tier: 'DIAMOND', division: 'I' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.tier).toBe('DIAMOND')
			expect(data.division).toBe('I')
		}
	})

	it('creates rank without division for MASTER+', async () => {
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
})
