import { beforeEach, describe, expect, it } from 'bun:test'
import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { env } from '@test/setup'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { guilds } from '@/db/schema'
import { typedApp as getTypedApp } from './get'
import { typedApp } from './update'

describe('PATCH /v1/guilds/:guildId/settings', () => {
	const client = testClient(typedApp, env)
	const getClient = testClient(getTypedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('updates guild settings', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].settings.$patch(
			{
				param: { guildId: ctx.guildId },
				json: { initialRating: 1500, kFactor: 40 },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.initialRating).toBe(1500)
			expect(data.kFactor).toBe(40)
			expect(data.updatedAt).toBeDefined()
		}

		// Verify settings were updated
		const getRes = await getClient.v1.guilds[':guildId'].settings.$get({ param: { guildId: ctx.guildId } }, authHeaders)

		if (getRes.ok) {
			const data = await getRes.json()
			expect(data.initialRating).toBe(1500)
			expect(data.kFactor).toBe(40)
		}
	})

	it('auto-creates guild when not found', async () => {
		const res = await client.v1.guilds[':guildId'].settings.$patch(
			{
				param: { guildId: ctx.guildId },
				json: { initialRating: 1300 },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.initialRating).toBe(1300)
		}
	})
})
