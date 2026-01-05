import { beforeEach, describe, expect, it } from 'bun:test'
import { authHeaders, createTestContext, type TestContext } from '@test/context'
import { env } from '@test/setup'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { guilds, users } from '@/db/schema'
import { typedApp } from './create'

describe('POST /v1/guilds/:guildId/matches', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	it('creates a match with players', async () => {
		const db = drizzle(env.DB)
		const player1 = `player1_${ctx.guildId}`
		const player2 = `player2_${ctx.guildId}`
		await db.insert(guilds).values({ guildId: ctx.guildId })
		await db.insert(users).values([{ discordId: player1 }, { discordId: player2 }])

		const res = await client.v1.guilds[':guildId'].matches.$post(
			{
				param: { guildId: ctx.guildId },
				json: {
					channelId: 'channel_123',
					messageId: `message_${ctx.guildId}`,
					players: [
						{ discordId: player1, team: 'BLUE', role: 'TOP', ratingBefore: 1000 },
						{ discordId: player2, team: 'RED', role: 'TOP', ratingBefore: 1000 },
					],
				},
			},
			authHeaders,
		)

		expect(res.status).toBe(201)

		if (res.ok) {
			const data = await res.json()
			expect(data.id).toBeDefined()
			expect(data.status).toBe('voting')
			expect(data.createdAt).toBeDefined()
		}
	})

	it('creates a match without players', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const res = await client.v1.guilds[':guildId'].matches.$post(
			{
				param: { guildId: ctx.guildId },
				json: {
					channelId: 'channel_123',
					messageId: `message_${ctx.guildId}`,
					players: [],
				},
			},
			authHeaders,
		)

		expect(res.status).toBe(201)

		if (res.ok) {
			const data = await res.json()
			expect(data.id).toBeDefined()
			expect(data.status).toBe('voting')
		}
	})

	it('auto-creates guild and users on first call', async () => {
		const player1 = `new_player1_${ctx.guildId}`
		const player2 = `new_player2_${ctx.guildId}`

		const res = await client.v1.guilds[':guildId'].matches.$post(
			{
				param: { guildId: ctx.guildId },
				json: {
					channelId: 'channel_123',
					messageId: `message_${ctx.guildId}`,
					players: [
						{ discordId: player1, team: 'BLUE', role: 'TOP', ratingBefore: 1000 },
						{ discordId: player2, team: 'RED', role: 'TOP', ratingBefore: 1000 },
					],
				},
			},
			authHeaders,
		)

		expect(res.status).toBe(201)

		if (res.ok) {
			const data = await res.json()
			expect(data.id).toBeDefined()
			expect(data.status).toBe('voting')
		}
	})

	it('returns 409 when match with same messageId exists', async () => {
		const db = drizzle(env.DB)
		await db.insert(guilds).values({ guildId: ctx.guildId })

		const messageId = `duplicate_${ctx.guildId}`

		// Create first match
		await client.v1.guilds[':guildId'].matches.$post(
			{
				param: { guildId: ctx.guildId },
				json: {
					channelId: 'channel_123',
					messageId,
					players: [],
				},
			},
			authHeaders,
		)

		// Try to create second match with same messageId
		const res = await client.v1.guilds[':guildId'].matches.$post(
			{
				param: { guildId: ctx.guildId },
				json: {
					channelId: 'channel_456',
					messageId,
					players: [],
				},
			},
			authHeaders,
		)

		expect(res.status).toBe(409)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Match with this messageId already exists')
		}
	})
})
