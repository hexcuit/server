import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { guildPendingMatches } from '@/db/schema'
import { app } from '@/index'

describe('POST /v1/guilds/{guildId}/matches/{matchId}/votes', () => {
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
		const res = await app.request(
			`/v1/guilds/${ctx.guildId}/matches/${matchId}/votes`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': env.API_KEY,
				},
				body: JSON.stringify({
					discordId: ctx.discordId,
					vote: 'BLUE',
				}),
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as {
			changed: boolean
			blueVotes: number
			redVotes: number
		}
		expect(data.changed).toBe(true)
		expect(data.blueVotes).toBe(1)
		expect(data.redVotes).toBe(0)
	})

	it('returns 403 for non-participant', async () => {
		const res = await app.request(
			`/v1/guilds/${ctx.guildId}/matches/${matchId}/votes`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': env.API_KEY,
				},
				body: JSON.stringify({
					discordId: 'non-participant',
					vote: 'BLUE',
				}),
			},
			env,
		)

		expect(res.status).toBe(403)
	})

	it('returns 404 for non-existent match', async () => {
		const res = await app.request(
			`/v1/guilds/${ctx.guildId}/matches/${crypto.randomUUID()}/votes`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': env.API_KEY,
				},
				body: JSON.stringify({
					discordId: ctx.discordId,
					vote: 'BLUE',
				}),
			},
			env,
		)

		expect(res.status).toBe(404)
	})

	it('returns 404 when accessing match with different guildId', async () => {
		const differentGuildId = crypto.randomUUID()
		const res = await app.request(
			`/v1/guilds/${differentGuildId}/matches/${matchId}/votes`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': env.API_KEY,
				},
				body: JSON.stringify({
					discordId: ctx.discordId,
					vote: 'BLUE',
				}),
			},
			env,
		)

		expect(res.status).toBe(404)
	})

	it('returns 401 without API key', async () => {
		const res = await app.request(
			`/v1/guilds/${ctx.guildId}/matches/${matchId}/votes`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					discordId: ctx.discordId,
					vote: 'BLUE',
				}),
			},
			env,
		)

		expect(res.status).toBe(401)
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

		const res = await app.request(
			`/v1/guilds/${ctx.guildId}/matches/${completedMatchId}/votes`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': env.API_KEY,
				},
				body: JSON.stringify({
					discordId: ctx.discordId,
					vote: 'BLUE',
				}),
			},
			env,
		)

		expect(res.status).toBe(400)
	})

	it('changes vote from blue to red', async () => {
		// First vote blue
		await app.request(
			`/v1/guilds/${ctx.guildId}/matches/${matchId}/votes`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': env.API_KEY,
				},
				body: JSON.stringify({
					discordId: ctx.discordId,
					vote: 'BLUE',
				}),
			},
			env,
		)

		// Change to red
		const res = await app.request(
			`/v1/guilds/${ctx.guildId}/matches/${matchId}/votes`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': env.API_KEY,
				},
				body: JSON.stringify({
					discordId: ctx.discordId,
					vote: 'RED',
				}),
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as {
			changed: boolean
			blueVotes: number
			redVotes: number
		}
		expect(data.changed).toBe(true)
		expect(data.blueVotes).toBe(0)
		expect(data.redVotes).toBe(1)
	})

	it('returns unchanged when voting same option again', async () => {
		// First vote blue
		await app.request(
			`/v1/guilds/${ctx.guildId}/matches/${matchId}/votes`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': env.API_KEY,
				},
				body: JSON.stringify({
					discordId: ctx.discordId,
					vote: 'BLUE',
				}),
			},
			env,
		)

		// Vote blue again
		const res = await app.request(
			`/v1/guilds/${ctx.guildId}/matches/${matchId}/votes`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': env.API_KEY,
				},
				body: JSON.stringify({
					discordId: ctx.discordId,
					vote: 'BLUE',
				}),
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as {
			changed: boolean
			blueVotes: number
			redVotes: number
		}
		expect(data.changed).toBe(false)
		expect(data.blueVotes).toBe(1)
		expect(data.redVotes).toBe(0)
	})
})
