import { beforeEach, describe, expect, it } from 'bun:test'
import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { env } from '@test/setup'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { guilds, guildUserStats, users } from '@/db/schema'
import { typedApp } from './get'

describe('GET /v1/guilds/:guildId/users/:discordId/stats', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('returns user stats', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values({ discordId: ctx.discordId })
		await db.insert(guildUserStats).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
			rating: 1300,
			wins: 5,
			losses: 3,
		})

		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.$get(
			{ param: { guildId: ctx.guildId, discordId: ctx.discordId } },
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.discordId).toBe(ctx.discordId)
			expect(data.rating).toBe(1300)
			expect(data.wins).toBe(5)
			expect(data.losses).toBe(3)
		}
	})

	it('returns 404 when guild not found', async () => {
		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.$get(
			{ param: { guildId: 'nonexistent', discordId: ctx.discordId } },
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Guild not found')
		}
	})

	it('returns 404 when stats not found', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.$get(
			{ param: { guildId: ctx.guildId, discordId: 'nonexistent' } },
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Stats not found')
		}
	})
})
