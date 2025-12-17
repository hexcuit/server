import { env } from 'cloudflare:test'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTestContext, type TestContext } from '@/__tests__/test-utils'
import { lolRanks, users } from '@/db/schema'
import { app } from '@/index'

describe('PUT /v1/ranks/{discordId}', () => {
	let ctx: TestContext

	beforeEach(async () => {
		ctx = createTestContext()
	})

	it('returns 201 when creating a new rank', async () => {
		const res = await app.request(
			`/v1/ranks/${ctx.discordId}`,
			{
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': env.API_KEY,
				},
				body: JSON.stringify({
					tier: 'GOLD',
					division: 'II',
				}),
			},
			env,
		)

		expect(res.status).toBe(201)

		const data = (await res.json()) as { rank: { discordId: string; tier: string; division: string } }
		expect(data).toHaveProperty('rank')
		expect(data.rank).toEqual({
			discordId: ctx.discordId,
			tier: 'GOLD',
			division: 'II',
		})

		const db = drizzle(env.DB)
		const saved = await db.select().from(lolRanks).where(eq(lolRanks.discordId, ctx.discordId)).get()

		expect(saved).toBeDefined()
		expect(saved?.tier).toBe('GOLD')
		expect(saved?.division).toBe('II')
	})

	it('returns 200 when updating an existing rank', async () => {
		const db = drizzle(env.DB)

		await db.insert(users).values({ discordId: ctx.discordId })
		await db.insert(lolRanks).values({
			discordId: ctx.discordId,
			tier: 'SILVER',
			division: 'I',
		})

		const res = await app.request(
			`/v1/ranks/${ctx.discordId}`,
			{
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': env.API_KEY,
				},
				body: JSON.stringify({
					tier: 'PLATINUM',
					division: 'IV',
				}),
			},
			env,
		)

		expect(res.status).toBe(200)

		const data = (await res.json()) as { rank: { discordId: string; tier: string; division: string } }
		expect(data.rank).toEqual({
			discordId: ctx.discordId,
			tier: 'PLATINUM',
			division: 'IV',
		})

		const updated = await db.select().from(lolRanks).where(eq(lolRanks.discordId, ctx.discordId)).get()
		expect(updated?.tier).toBe('PLATINUM')
		expect(updated?.division).toBe('IV')
	})

	it('returns 401 without API key', async () => {
		const res = await app.request(
			`/v1/ranks/${ctx.discordId}`,
			{
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					tier: 'GOLD',
					division: 'II',
				}),
			},
			env,
		)

		expect(res.status).toBe(401)
	})

	it('returns 401 with invalid API key', async () => {
		const res = await app.request(
			`/v1/ranks/${ctx.discordId}`,
			{
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': 'invalid-key',
				},
				body: JSON.stringify({
					tier: 'GOLD',
					division: 'II',
				}),
			},
			env,
		)

		expect(res.status).toBe(401)
	})

	it('returns 400 on validation error', async () => {
		const res = await app.request(
			`/v1/ranks/${ctx.discordId}`,
			{
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': env.API_KEY,
				},
				body: JSON.stringify({}),
			},
			env,
		)

		expect(res.status).toBe(400)
	})
})
