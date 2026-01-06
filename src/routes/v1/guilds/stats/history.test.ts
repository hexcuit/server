import { beforeEach, describe, expect, it } from 'bun:test'
import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { env } from '@test/setup'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { guilds, guildUserMatchHistory, guildUserStats, matches, users } from '@/db/schema'
import { typedApp } from './history'

describe('GET /v1/guilds/:guildId/users/:discordId/history', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('returns user match history', async () => {
		const db = drizzle(env.DB)
		const matchId = ctx.generateMatchId()

		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values({ discordId: ctx.discordId })
		await db.insert(guildUserStats).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
		})
		await db.insert(matches).values({
			id: matchId,
			guildId: ctx.guildId,
			status: 'confirmed',
		})
		await db.insert(guildUserMatchHistory).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
			matchId,
			result: 'win',
			ratingChange: 16,
			ratingAfter: 1216,
		})

		const res = await client.v1.guilds[':guildId'].users[':discordId'].history.$get(
			{ param: { guildId: ctx.guildId, discordId: ctx.discordId }, query: {} },
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.history.length).toBe(1)
			expect(data.history[0].matchId).toBe(matchId)
			expect(data.history[0].result).toBe('win')
			expect(data.history[0].ratingChange).toBe(16)
			expect(data.history[0].ratingAfter).toBe(1216)
			expect(data.total).toBe(1)
		}
	})

	it('returns 404 when guild not found', async () => {
		const res = await client.v1.guilds[':guildId'].users[':discordId'].history.$get(
			{ param: { guildId: 'nonexistent', discordId: ctx.discordId }, query: {} },
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Guild not found')
		}
	})

	it('returns 404 when user stats not found', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].users[':discordId'].history.$get(
			{ param: { guildId: ctx.guildId, discordId: 'nonexistent' }, query: {} },
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('User stats not found')
		}
	})
})
