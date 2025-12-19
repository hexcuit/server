import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import { beforeEach, describe, expect, it } from 'vitest'
import {
	authHeaders,
	createApiClient,
	createTestContext,
	setupTestUsers,
	type TestContext,
} from '@/__tests__/test-utils'
import { guildRatings } from '@/db/schema'

describe('upsertRating', () => {
	const client = createApiClient()
	let ctx: TestContext

	beforeEach(async () => {
		ctx = createTestContext()
	})

	it('creates a new rating and returns 201', async () => {
		const res = await client.v1.guilds[':guildId'].ratings.$put(
			{
				param: { guildId: ctx.guildId },
				json: { discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(201)

		const data = await res.json()
		expect(data.created).toBe(true)
		expect(data.rating.discordId).toBe(ctx.discordId)
		expect(data.rating.rating).toBe(1200) // INITIAL_RATING
	})

	it('returns existing rating with 200', async () => {
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

		const res = await client.v1.guilds[':guildId'].ratings.$put(
			{
				param: { guildId: ctx.guildId },
				json: { discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		const data = await res.json()
		expect(data.created).toBe(false)
		expect(data.rating.rating).toBe(1500)
	})
})
