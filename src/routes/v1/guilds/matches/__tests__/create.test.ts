import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'
import { guildPendingMatches, users } from '@/db/schema'
import { app } from '@/index'

describe('POST /v1/guilds/{guildId}/matches', () => {
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
	})

	it('creates a new match and returns 201', async () => {
		const teamAssignments = {
			player1: { team: 'blue', role: 'top', rating: 1500 },
			player2: { team: 'red', role: 'top', rating: 1500 },
		}

		const res = await app.request(
			`/v1/guilds/${testGuildId}/matches`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': apiKey,
				},
				body: JSON.stringify({
					id: matchId,
					channelId: testChannelId,
					messageId: testMessageId,
					teamAssignments,
				}),
			},
			env,
		)

		expect(res.status).toBe(201)

		const data = (await res.json()) as { matchId: string }
		expect(data.matchId).toBe(matchId)

		const db = drizzle(env.DB)
		const saved = await db.select().from(guildPendingMatches).where(eq(guildPendingMatches.id, matchId)).get()
		expect(saved).toBeDefined()
		expect(saved?.status).toBe('voting')
	})

	it('returns 401 without API key', async () => {
		const res = await app.request(
			`/v1/guilds/${testGuildId}/matches`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					id: matchId,
					channelId: testChannelId,
					messageId: testMessageId,
					teamAssignments: {},
				}),
			},
			env,
		)

		expect(res.status).toBe(401)
	})
})
