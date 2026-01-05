import { beforeEach, describe, expect, it } from 'bun:test'
import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { env } from '@test/setup'
import { testClient } from 'hono/testing'
import { typedApp } from './create'

describe('POST /v1/guilds', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('creates a new guild', async () => {
		const res = await client.v1.guilds.$post(
			{
				json: { guildId: ctx.guildId },
			},
			authHeaders,
		)

		expect(res.status).toBe(201)

		if (res.ok) {
			const data = await res.json()
			expect(data.guildId).toBe(ctx.guildId)
			expect(data.plan).toBe('free')
			expect(data.createdAt).toBeDefined()
		}
	})

	it('returns 409 when guild already exists', async () => {
		// Create guild first
		await client.v1.guilds.$post(
			{
				json: { guildId: ctx.guildId },
			},
			authHeaders,
		)

		// Try to create again
		const res = await client.v1.guilds.$post(
			{
				json: { guildId: ctx.guildId },
			},
			authHeaders,
		)

		expect(res.status).toBe(409)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Guild already exists')
		}
	})
})
