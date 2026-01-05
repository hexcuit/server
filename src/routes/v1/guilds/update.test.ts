import { beforeEach, describe, expect, it } from 'bun:test'
import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { env } from '@test/setup'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { guilds } from '@/db/schema'
import { typedApp } from './update'

describe('PATCH /v1/guilds/:guildId', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('updates guild plan', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].$patch(
			{
				param: { guildId: ctx.guildId },
				json: { plan: 'premium' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.guildId).toBe(ctx.guildId)
			expect(data.plan).toBe('premium')
			expect(data.updatedAt).toBeDefined()
		}
	})

	it('updates guild planExpiresAt', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const expiresAt = new Date('2026-01-01T00:00:00.000Z')

		const res = await client.v1.guilds[':guildId'].$patch(
			{
				param: { guildId: ctx.guildId },
				json: { plan: 'premium', planExpiresAt: expiresAt },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.plan).toBe('premium')
			expect(data.planExpiresAt).toBe(expiresAt.toISOString())
		}
	})

	it('auto-creates guild when not found', async () => {
		const res = await client.v1.guilds[':guildId'].$patch(
			{
				param: { guildId: ctx.guildId },
				json: { plan: 'premium' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.guildId).toBe(ctx.guildId)
			expect(data.plan).toBe('premium')
		}
	})
})
