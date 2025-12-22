import { beforeEach, describe, expect, it } from 'bun:test'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { guildRatings } from '@/db/schema'
import { typedApp } from './get'

describe('getRatings', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(async () => {
		ctx = createTestContext()
		const db = drizzle(env.DB)

		await setupTestUsers(db, ctx)
		await db.insert(guildRatings).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
			rating: 1500,
			wins: 5,
			losses: 3,
			placementGames: 10,
		})
	})

	it('returns rating for registered user', async () => {
		const res = await client.v1.guilds[':guildId'].ratings.$get(
			{
				param: { guildId: ctx.guildId },
				query: { id: [ctx.discordId] },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		const data = await res.json()
		expect(data.ratings).toHaveLength(1)
		expect(data.ratings[0]?.discordId).toBe(ctx.discordId)
		expect(data.ratings[0]?.rating).toBe(1500)
	})

	it('returns null rating for unregistered user', async () => {
		const unregisteredId = `unregistered-${ctx.prefix}`

		const res = await client.v1.guilds[':guildId'].ratings.$get(
			{
				param: { guildId: ctx.guildId },
				query: { id: [unregisteredId] },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		const data = await res.json()
		expect(data.ratings).toHaveLength(1)
		expect(data.ratings[0]?.discordId).toBe(unregisteredId)
		expect(data.ratings[0]?.rating).toBeNull()
	})
})
