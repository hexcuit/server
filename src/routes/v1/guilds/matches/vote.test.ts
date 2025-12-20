import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import { testClient } from 'hono/testing'
import { beforeEach, describe, expect, it } from 'vitest'
import { authHeaders, createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { guildPendingMatches } from '@/db/schema'
import { typedApp } from './vote'

describe('voteMatch', () => {
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

	it('registers a vote', async () => {
		const res = await client.v1.guilds[':guildId'].matches[':matchId'].votes.$post(
			{
				param: { guildId: ctx.guildId, matchId },
				json: { discordId: ctx.discordId, vote: 'BLUE' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.changed).toBe(true)
			expect(data.blueVotes).toBe(1)
			expect(data.redVotes).toBe(0)
		}
	})

	it('returns 403 for non-participant', async () => {
		const res = await client.v1.guilds[':guildId'].matches[':matchId'].votes.$post(
			{
				param: { guildId: ctx.guildId, matchId },
				json: { discordId: 'non-participant', vote: 'BLUE' },
			},
			authHeaders,
		)

		expect(res.status).toBe(403)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Not a participant')
		}
	})

	it('returns 404 for non-existent match', async () => {
		const res = await client.v1.guilds[':guildId'].matches[':matchId'].votes.$post(
			{
				param: { guildId: ctx.guildId, matchId: crypto.randomUUID() },
				json: { discordId: ctx.discordId, vote: 'BLUE' },
			},
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Match not found')
		}
	})

	it('returns 404 when accessing match with different guildId', async () => {
		const differentGuildId = crypto.randomUUID()
		const res = await client.v1.guilds[':guildId'].matches[':matchId'].votes.$post(
			{
				param: { guildId: differentGuildId, matchId },
				json: { discordId: ctx.discordId, vote: 'BLUE' },
			},
			authHeaders,
		)

		expect(res.status).toBe(404)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Match not found')
		}
	})

	it('returns 400 when match is not in voting state', async () => {
		const db = drizzle(env.DB)
		const completedMatchId = ctx.generatePendingMatchId()

		const teamAssignments = {
			[ctx.discordId]: { team: 'BLUE', role: 'TOP', rating: 1500 },
			[ctx.discordId2]: { team: 'RED', role: 'TOP', rating: 1500 },
		}

		await db.insert(guildPendingMatches).values({
			id: completedMatchId,
			guildId: ctx.guildId,
			channelId: ctx.channelId,
			messageId: ctx.messageId,
			status: 'confirmed',
			teamAssignments: JSON.stringify(teamAssignments),
			blueVotes: 0,
			redVotes: 0,
		})

		const res = await client.v1.guilds[':guildId'].matches[':matchId'].votes.$post(
			{
				param: { guildId: ctx.guildId, matchId: completedMatchId },
				json: { discordId: ctx.discordId, vote: 'BLUE' },
			},
			authHeaders,
		)

		expect(res.status).toBe(400)

		if (!res.ok) {
			const data = await res.json()
			expect(data.message).toBe('Match is not in voting state')
		}
	})

	it('changes vote from blue to red', async () => {
		// First vote blue
		await client.v1.guilds[':guildId'].matches[':matchId'].votes.$post(
			{
				param: { guildId: ctx.guildId, matchId },
				json: { discordId: ctx.discordId, vote: 'BLUE' },
			},
			authHeaders,
		)

		// Change to red
		const res = await client.v1.guilds[':guildId'].matches[':matchId'].votes.$post(
			{
				param: { guildId: ctx.guildId, matchId },
				json: { discordId: ctx.discordId, vote: 'RED' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.changed).toBe(true)
			expect(data.blueVotes).toBe(0)
			expect(data.redVotes).toBe(1)
		}
	})

	it('returns unchanged when voting same option again', async () => {
		// First vote blue
		await client.v1.guilds[':guildId'].matches[':matchId'].votes.$post(
			{
				param: { guildId: ctx.guildId, matchId },
				json: { discordId: ctx.discordId, vote: 'BLUE' },
			},
			authHeaders,
		)

		// Vote blue again
		const res = await client.v1.guilds[':guildId'].matches[':matchId'].votes.$post(
			{
				param: { guildId: ctx.guildId, matchId },
				json: { discordId: ctx.discordId, vote: 'BLUE' },
			},
			authHeaders,
		)

		expect(res.status).toBe(200)

		if (res.ok) {
			const data = await res.json()
			expect(data.changed).toBe(false)
			expect(data.blueVotes).toBe(1)
			expect(data.redVotes).toBe(0)
		}
	})
})
