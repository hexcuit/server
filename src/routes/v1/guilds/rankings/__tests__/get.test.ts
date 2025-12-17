import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { guildRatings } from '@/db/schema'
import { app } from '@/index'
import { PLACEMENT_GAMES } from '@/utils/elo'

describe('GET /v1/guilds/{guildId}/rankings', () => {
	let ctx: TestContext

	beforeEach(async () => {
		ctx = createTestContext()
		const db = drizzle(env.DB)

		await setupTestUsers(db, ctx)
		await db.insert(guildRatings).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
			rating: 1600,
			wins: 10,
			losses: 5,
			placementGames: PLACEMENT_GAMES,
		})
		await db.insert(guildRatings).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId2,
			rating: 1500,
			wins: 8,
			losses: 7,
			placementGames: PLACEMENT_GAMES,
		})
	})

	it('returns rankings sorted by rating', async () => {
		const res = await app.request(
			`/v1/guilds/${ctx.guildId}/rankings`,
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
			guildId: string
			rankings: Array<{ position: number; discordId: string; rating: number }>
		}
		expect(data.guildId).toBe(ctx.guildId)
		expect(data.rankings).toHaveLength(2)
		expect(data.rankings[0]?.position).toBe(1)
		expect(data.rankings[0]?.discordId).toBe(ctx.discordId)
		expect(data.rankings[0]?.rating).toBe(1600)
		expect(data.rankings[1]?.position).toBe(2)
		expect(data.rankings[1]?.discordId).toBe(ctx.discordId2)
	})

	it('respects limit parameter', async () => {
		const res = await app.request(
			`/v1/guilds/${ctx.guildId}/rankings?limit=1`,
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
			rankings: Array<{ position: number; discordId: string }>
		}
		expect(data.rankings).toHaveLength(1)
	})

	it('returns 401 without API key', async () => {
		const res = await app.request(
			`/v1/guilds/${ctx.guildId}/rankings`,
			{
				method: 'GET',
			},
			env,
		)

		expect(res.status).toBe(401)
	})
})
