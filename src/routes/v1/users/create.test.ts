import { beforeEach, describe, expect, it } from 'bun:test'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, type TestContext } from '@/__tests__/test-utils'
import { typedApp } from './create'

describe('POST /v1/users', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('creates a new user', async () => {
		const res = await client.v1.users.$post(
			{
				json: { discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(201)

		if (res.ok) {
			const data = await res.json()
			expect(data.discordId).toBe(ctx.discordId)
			expect(data.createdAt).toBeDefined()
			expect(data.rank).toBeNull()
		}
	})

	it('returns 409 when user already exists', async () => {
		// Create user first
		await client.v1.users.$post(
			{
				json: { discordId: ctx.discordId },
			},
			authHeaders,
		)

		// Try to create again
		const res = await client.v1.users.$post(
			{
				json: { discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(409)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('User already exists')
		}
	})
})
