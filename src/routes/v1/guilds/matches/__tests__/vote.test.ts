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
			[ctx.discordId]: { team: 'blue', role: 'top', rating: 1500 },
			[ctx.discordId2]: { team: 'red', role: 'top', rating: 1500 },
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
					vote: 'blue',
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
					vote: 'blue',
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
					vote: 'blue',
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
					vote: 'blue',
				}),
			},
			env,
		)

		expect(res.status).toBe(401)
	})
})
