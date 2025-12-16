import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'
import { guildPendingMatches, users } from '@/db/schema'
import { app } from '@/index'

describe('DELETE /v1/guilds/{guildId}/matches/{matchId}', () => {
	const testGuildId = 'test-guild-123'
	const testChannelId = 'test-channel-123'
	const testMessageId = 'test-message-123'
	const apiKey = 'test-api-key'
	const matchId = crypto.randomUUID()

	let env: { DB: D1Database; API_KEY: string }
	let dispose: () => Promise<void>

	beforeAll(async () => {
		const proxy = await getPlatformProxy<{ DB: D1Database; API_KEY: string }>({
			configPath: './wrangler.jsonc',
		})
		env = { ...proxy.env, API_KEY: apiKey }
		dispose = proxy.dispose
	})

	afterAll(async () => {
		await dispose()
	})

	beforeEach(async () => {
		const db = drizzle(env.DB)
		await db.delete(guildPendingMatches).where(eq(guildPendingMatches.id, matchId))
		await db.delete(users).where(eq(users.discordId, 'player1'))
		await db.delete(users).where(eq(users.discordId, 'player2'))

		const teamAssignments = {
			player1: { team: 'blue', role: 'top', rating: 1500 },
			player2: { team: 'red', role: 'top', rating: 1500 },
		}

		await db.insert(users).values({ discordId: 'player1' })
		await db.insert(users).values({ discordId: 'player2' })
		await db.insert(guildPendingMatches).values({
			id: matchId,
			guildId: testGuildId,
			channelId: testChannelId,
			messageId: testMessageId,
			status: 'voting',
			teamAssignments: JSON.stringify(teamAssignments),
			blueVotes: 0,
			redVotes: 0,
		})
	})

	it('cancels a match and returns deleted: true', async () => {
		const res = await app.request(
			`/v1/guilds/${testGuildId}/matches/${matchId}`,
			{
				method: 'DELETE',
				headers: {
					'x-api-key': apiKey,
				},
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as { deleted: boolean }
		expect(data.deleted).toBe(true)

		const db = drizzle(env.DB)
		const match = await db.select().from(guildPendingMatches).where(eq(guildPendingMatches.id, matchId)).get()
		expect(match?.status).toBe('cancelled')
	})

	it('returns 404 for non-existent match', async () => {
		const res = await app.request(
			`/v1/guilds/${testGuildId}/matches/${crypto.randomUUID()}`,
			{
				method: 'DELETE',
				headers: {
					'x-api-key': apiKey,
				},
			},
			env,
		)

		expect(res.status).toBe(404)
	})

	it('returns 400 for non-voting match', async () => {
		const db = drizzle(env.DB)
		await db.update(guildPendingMatches).set({ status: 'confirmed' }).where(eq(guildPendingMatches.id, matchId))

		const res = await app.request(
			`/v1/guilds/${testGuildId}/matches/${matchId}`,
			{
				method: 'DELETE',
				headers: {
					'x-api-key': apiKey,
				},
			},
			env,
		)

		expect(res.status).toBe(400)
	})

	it('returns 401 without API key', async () => {
		const res = await app.request(
			`/v1/guilds/${testGuildId}/matches/${matchId}`,
			{
				method: 'DELETE',
			},
			env,
		)

		expect(res.status).toBe(401)
	})
})
