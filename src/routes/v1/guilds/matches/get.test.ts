import { beforeEach, describe, expect, it } from 'bun:test'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { env } from '@/__tests__/setup'
import { authHeaders, createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { guildMatchVotes, guildPendingMatches } from '@/db/schema'
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
			drawVotes: 0,
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
			expect(data.votesRequired).toBe(2)
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

	it('returns 404 when match belongs to different guild', async () => {
		const otherGuildId = `other-guild-${ctx.prefix}`

		const res = await client.v1.guilds[':guildId'].matches[':matchId'].$get(
			{ param: { guildId: otherGuildId, matchId } },
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Match not found')
		}
	})

	it('returns match with votes', async () => {
		const db = drizzle(env.DB)
		await db.insert(guildMatchVotes).values([
			{ pendingMatchId: matchId, discordId: ctx.discordId, vote: 'BLUE' },
			{ pendingMatchId: matchId, discordId: ctx.discordId2, vote: 'RED' },
		])

		const res = await client.v1.guilds[':guildId'].matches[':matchId'].$get(
			{ param: { guildId: ctx.guildId, matchId } },
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.votes).toHaveLength(2)
			expect(data.votes).toContainEqual({ discordId: ctx.discordId, vote: 'BLUE' })
			expect(data.votes).toContainEqual({ discordId: ctx.discordId2, vote: 'RED' })
		}
	})
})
