import { env } from 'cloudflare:test'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTestContext, setupTestUsers, type TestContext } from '@/__tests__/test-utils'
import { guildPendingMatches } from '@/db/schema'
import { app } from '@/index'

describe('DELETE /v1/guilds/{guildId}/matches/{matchId}', () => {
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

	it('cancels a match and returns deleted: true', async () => {
		const res = await app.request(
			`/v1/guilds/${ctx.guildId}/matches/${matchId}`,
			{
				method: 'DELETE',
				headers: {
					'x-api-key': env.API_KEY,
				},
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as { deleted: boolean }
		expect(data.deleted).toBe(true)

		const db = drizzle(env.DB)
		const match = await db.select().from(guildPendingMatches).where(eq(guildPendingMatches.id, matchId)).get()
		expect(match?.status).toBe('cancelled')
	})

	it('returns 404 for non-existent match', async () => {
		const res = await app.request(
			`/v1/guilds/${ctx.guildId}/matches/${crypto.randomUUID()}`,
			{
				method: 'DELETE',
				headers: {
					'x-api-key': env.API_KEY,
				},
			},
			env,
		)

		expect(res.status).toBe(404)
	})

	it('returns 400 for non-voting match', async () => {
		const db = drizzle(env.DB)
		await db.update(guildPendingMatches).set({ status: 'confirmed' }).where(eq(guildPendingMatches.id, matchId))

		const res = await app.request(
			`/v1/guilds/${ctx.guildId}/matches/${matchId}`,
			{
				method: 'DELETE',
				headers: {
					'x-api-key': env.API_KEY,
				},
			},
			env,
		)

		expect(res.status).toBe(400)
	})

	it('returns 401 without API key', async () => {
		const res = await app.request(
			`/v1/guilds/${ctx.guildId}/matches/${matchId}`,
			{
				method: 'DELETE',
			},
			env,
		)

		expect(res.status).toBe(401)
	})
})
