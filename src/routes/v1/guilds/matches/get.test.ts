import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { authHeaders, createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { guildPendingMatches } from '@/db/schema'
import { typedApp } from './get'

describe('getMatch', () => {
	const client = testClient(typedApp, env)
	let ctx: TestContext
	let matchId: string

	beforeEach(async () => {
		ctx = createTestContext()
		matchId = ctx.generatePendingMatchId()
		const db = drizzle(env.DB)

		await setupTestUsers(db, ctx)

		const teamAssignments = {
			[ctx.discordId]: { team: 'BLUE', role: 'TOP', rating: 1500 },
			[ctx.discordId2]: { team: 'RED', role: 'TOP', rating: 1500 },
		}

		await db.insert(guildPendingMatches).values({
			id: matchId,
			guildId: ctx.guildId,
			channelId: ctx.channelId,
			messageId: ctx.messageId,
			status: 'voting',
			teamAssignments: JSON.stringify(teamAssignments),
			blueVotes: 0,
			redVotes: 0,
		})
	})

	it('returns match details', async () => {
		const res = await client.v1.guilds[':guildId'].matches[':matchId'].$get(
			{ param: { guildId: ctx.guildId, matchId } },
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.match.id).toBe(matchId)
			expect(data.match.status).toBe('voting')
			expect(data.totalParticipants).toBe(2)
			expect(data.votesRequired).toBe(1)
		}
	})

	it('returns 404 for non-existent match', async () => {
		const res = await client.v1.guilds[':guildId'].matches[':matchId'].$get(
			{ param: { guildId: ctx.guildId, matchId: crypto.randomUUID() } },
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Match not found')
		}
	})
})
