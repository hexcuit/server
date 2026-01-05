import { beforeEach, describe, expect, it } from 'bun:test'
import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { seedRank, seedUser } from '@test/seed'
import { env } from '@test/setup'
import { testClient } from 'hono/testing'
import { typedApp } from './get'

describe('GET /v1/users/:discordId', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('returns user without rank', async () => {
		await seedUser(ctx.discordId)

		const res = await client.v1.users[':discordId'].$get(
			{
				param: { discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.discordId).toBe(ctx.discordId)
			expect(data.createdAt).toBeDefined()
			expect(data.rank).toBeNull()
		}
	})

	it('returns user with rank', async () => {
		await seedRank(ctx.discordId, { tier: 'GOLD', division: 'II' })

		const res = await client.v1.users[':discordId'].$get(
			{
				param: { discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.discordId).toBe(ctx.discordId)
			expect(data.rank).toEqual({
				tier: 'GOLD',
				division: 'II',
			})
		}
	})

	it('returns 404 when user not found', async () => {
		const res = await client.v1.users[':discordId'].$get(
			{
				param: { discordId: 'nonexistent' },
			},
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('User not found')
		}
	})
})
