import { env } from 'cloudflare:test'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTestContext, type TestContext } from '@/__tests__/test-utils'
import { guildPendingMatches } from '@/db/schema'
import { app } from '@/index'

describe('POST /v1/guilds/{guildId}/matches', () => {
	let ctx: TestContext

	beforeEach(async () => {
		ctx = createTestContext()
	})

	it('creates a new match and returns 201', async () => {
		const matchId = ctx.generatePendingMatchId()
		const player1 = ctx.generateUserId()
		const player2 = ctx.generateUserId()

		const teamAssignments = {
			[player1]: { team: 'blue', role: 'TOP', rating: 1500 },
			[player2]: { team: 'red', role: 'TOP', rating: 1500 },
		}

		const res = await app.request(
			`/v1/guilds/${ctx.guildId}/matches`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': env.API_KEY,
				},
				body: JSON.stringify({
					id: matchId,
					channelId: ctx.channelId,
					messageId: ctx.messageId,
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
		const matchId = ctx.generatePendingMatchId()

		const res = await app.request(
			`/v1/guilds/${ctx.guildId}/matches`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					id: matchId,
					channelId: ctx.channelId,
					messageId: ctx.messageId,
					teamAssignments: {},
				}),
			},
			env,
		)

		expect(res.status).toBe(401)
	})
})
