import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { guildRatings } from '@/db/schema'
import { app } from '@/index'

describe('GET /v1/guilds/{guildId}/ratings', () => {
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
		const res = await app.request(
			`/v1/guilds/${ctx.guildId}/ratings?id=${ctx.discordId}`,
			{
				method: 'GET',
				headers: {
					'x-api-key': env.API_KEY,
				},
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as {
			ratings: Array<{ discordId: string; rating: number | null }>
		}
		expect(data.ratings).toHaveLength(1)
		expect(data.ratings[0]?.discordId).toBe(ctx.discordId)
		expect(data.ratings[0]?.rating).toBe(1500)
	})

	it('returns null rating for unregistered user', async () => {
		const unregisteredId = `unregistered-${ctx.prefix}`

		const res = await app.request(
			`/v1/guilds/${ctx.guildId}/ratings?id=${unregisteredId}`,
			{
				method: 'GET',
				headers: {
					'x-api-key': env.API_KEY,
				},
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as {
			ratings: Array<{ discordId: string; rating: number | null }>
		}
		expect(data.ratings).toHaveLength(1)
		expect(data.ratings[0]?.discordId).toBe(unregisteredId)
		expect(data.ratings[0]?.rating).toBeNull()
	})

	it('returns 401 without API key', async () => {
		const res = await app.request(
			`/v1/guilds/${ctx.guildId}/ratings?id=${ctx.discordId}`,
			{
				method: 'GET',
			},
			env,
		)

		expect(res.status).toBe(401)
	})
})
