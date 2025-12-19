import { env } from 'cloudflare:test'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { authHeaders, createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { guildPendingMatches } from '@/db/schema'
import { typedApp } from './remove'

describe('removeMatch', () => {
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

	it('cancels a match and returns deleted: true', async () => {
		const res = await client.v1.guilds[':guildId'].matches[':matchId'].$delete(
			{ param: { guildId: ctx.guildId, matchId } },
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.deleted).toBe(true)
		}

		const db = drizzle(env.DB)
		const match = await db.select().from(guildPendingMatches).where(eq(guildPendingMatches.id, matchId)).get()
		expect(match?.status).toBe('cancelled')
	})

	it('returns 404 for non-existent match', async () => {
		const res = await client.v1.guilds[':guildId'].matches[':matchId'].$delete(
			{ param: { guildId: ctx.guildId, matchId: crypto.randomUUID() } },
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Match not found')
		}
	})

	it('returns 404 when accessing match from different guild', async () => {
		const otherGuildId = `other-guild-${ctx.prefix}`

		const res = await client.v1.guilds[':guildId'].matches[':matchId'].$delete(
			{ param: { guildId: otherGuildId, matchId } },
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Match not found')
		}
	})

	it('returns 400 for non-voting match', async () => {
		const db = drizzle(env.DB)
		await db.update(guildPendingMatches).set({ status: 'confirmed' }).where(eq(guildPendingMatches.id, matchId))

		const res = await client.v1.guilds[':guildId'].matches[':matchId'].$delete(
			{ param: { guildId: ctx.guildId, matchId } },
			authHeaders,
		)

		expect(res.status).toBe(400)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Match is not in voting state')
		}
	})

	it('returns 401 without API key', async () => {
		const res = await client.v1.guilds[':guildId'].matches[':matchId'].$delete({
			param: { guildId: ctx.guildId, matchId },
		})

		expect(res.status).toBe(401)
	})
})
