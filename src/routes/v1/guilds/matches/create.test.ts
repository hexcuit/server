import { env } from 'cloudflare:test'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { authHeaders, createTestContext, type TestContext } from '@/__tests__/test-utils'
import { guildPendingMatches } from '@/db/schema'
import { typedApp } from './create'

describe('createMatch', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext

	beforeEach(async () => {
		ctx = createTestContext()
	})

	it('creates a new match and returns 201', async () => {
		const matchId = ctx.generatePendingMatchId()
		const player1 = ctx.generateUserId()
		const player2 = ctx.generateUserId()

		const teamAssignments = {
			[player1]: { team: 'BLUE' as const, role: 'TOP' as const, rating: 1500 },
			[player2]: { team: 'RED' as const, role: 'TOP' as const, rating: 1500 },
		}

		const res = await client.v1.guilds[':guildId'].matches.$post(
			{
				param: { guildId: ctx.guildId },
				json: {
					id: matchId,
					channelId: ctx.channelId,
					messageId: ctx.messageId,
					teamAssignments,
				},
			},
			authHeaders,
		)

		expect(res.status).toBe(201)

		if (res.ok) {
			const data = await res.json()
			expect(data.matchId).toBe(matchId)
		}

		const db = drizzle(env.DB)
		const saved = await db.select().from(guildPendingMatches).where(eq(guildPendingMatches.id, matchId)).get()
		expect(saved).toBeDefined()
		expect(saved?.status).toBe('voting')
	})
})
