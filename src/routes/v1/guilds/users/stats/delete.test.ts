import { beforeEach, describe, expect, it } from 'bun:test'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, type TestContext } from '@/__tests__/test-utils'
import { guilds, guildUserStats, users } from '@/db/schema'
import { typedApp } from './delete'

describe('DELETE /v1/guilds/:guildId/users/:discordId/stats', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('deletes user stats', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values({ discordId: ctx.discordId })
		await db.insert(guildUserStats).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
			rating: 1200,
			peakRating: 1200,
		})

		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.$delete(
			{
				param: { guildId: ctx.guildId, discordId: ctx.discordId },
			},
			authHeaders,
		)

		expect(res.status).toBe(204)

		// Verify deletion
		const stats = await db
			.select()
			.from(guildUserStats)
			.where(and(eq(guildUserStats.guildId, ctx.guildId), eq(guildUserStats.discordId, ctx.discordId)))
			.get()

		expect(stats).toBeUndefined()
	})

	it('returns 404 when guild not found', async () => {
		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.$delete(
			{
				param: { guildId: 'nonexistent', discordId: ctx.discordId },
			},
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

		const res = await client.v1.guilds[':guildId'].users[':discordId'].stats.$delete(
			{
				param: { guildId: ctx.guildId, discordId: 'nonexistent' },
			},
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Stats not found')
		}
	})
})
