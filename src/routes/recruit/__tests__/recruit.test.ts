import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'
import { recruitmentParticipants, recruitments, users } from '@/db/schema'
import { app } from '@/index'
import { getDb } from '@/utils/db'

describe('Recruitment API', () => {
	const apiKey = 'test-api-key'
	const recruitmentId = crypto.randomUUID()
	const testGuildId = 'test-guild-123'
	const testChannelId = 'test-channel-123'
	const testMessageId = 'test-message-123'
	const testCreatorId = 'test-creator-123'
	const testUserId = 'test-user-456'

	let env: { DB: D1Database; API_KEY: string }
	let dispose: () => Promise<void>

	beforeAll(async () => {
		const proxy = await getPlatformProxy<{ DB: D1Database; API_KEY: string }>({
			configPath: './wrangler.jsonc',
		})
		env = { ...proxy.env, API_KEY: apiKey }
		dispose = proxy.dispose
	})

	afterAll(async () => {
		await dispose()
	})

	beforeEach(async () => {
		const db = getDb(env)

		// クリーンアップ
		await db.delete(recruitmentParticipants).where(eq(recruitmentParticipants.recruitmentId, recruitmentId))
		await db.delete(recruitments).where(eq(recruitments.id, recruitmentId))
		await db.delete(users).where(eq(users.discordId, testCreatorId))
		await db.delete(users).where(eq(users.discordId, testUserId))
	})

	describe('POST /recruit', () => {
		it('新しい募集を作成できる', async () => {
			const res = await app.request(
				'/recruit',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-api-key': apiKey,
					},
					body: JSON.stringify({
						id: recruitmentId,
						guildId: testGuildId,
						channelId: testChannelId,
						messageId: testMessageId,
						creatorId: testCreatorId,
						type: 'normal',
						anonymous: false,
					}),
				},
				env,
			)

			expect(res.status).toBe(200)

			const data = (await res.json()) as { success: boolean; recruitmentId: string }
			expect(data).toEqual({
				success: true,
				recruitmentId,
			})

			// DBに保存されているか確認
			const db = getDb(env)
			const saved = await db.select().from(recruitments).where(eq(recruitments.id, recruitmentId)).get()

			expect(saved).toBeDefined()
			expect(saved?.guildId).toBe(testGuildId)
			expect(saved?.status).toBe('open')
		})

		it('APIキーなしで403を返す', async () => {
			const res = await app.request(
				'/recruit',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						id: recruitmentId,
						guildId: testGuildId,
						channelId: testChannelId,
						messageId: testMessageId,
						creatorId: testCreatorId,
						type: 'normal',
						anonymous: false,
					}),
				},
				env,
			)

			expect(res.status).toBe(403)
		})
	})

	describe('GET /recruit/:id', () => {
		beforeEach(async () => {
			const db = getDb(env)

			// 募集を作成
			await db.insert(users).values({ discordId: testCreatorId })
			await db.insert(recruitments).values({
				id: recruitmentId,
				guildId: testGuildId,
				channelId: testChannelId,
				messageId: testMessageId,
				creatorId: testCreatorId,
				type: 'normal',
				anonymous: false,
				status: 'open',
			})
		})

		it('募集情報を取得できる', async () => {
			const res = await app.request(
				`/recruit/${recruitmentId}`,
				{
					method: 'GET',
					headers: {
						'x-api-key': apiKey,
					},
				},
				env,
			)

			expect(res.status).toBe(200)

			const data = (await res.json()) as {
				recruitment: { id: string }
				participants: unknown[]
				count: number
			}
			expect(data).toHaveProperty('recruitment')
			expect(data.recruitment.id).toBe(recruitmentId)
			expect(data).toHaveProperty('participants')
			expect(data.participants).toEqual([])
			expect(data.count).toBe(0)
		})

		it('存在しない募集は404を返す', async () => {
			const res = await app.request(
				`/recruit/${crypto.randomUUID()}`,
				{
					method: 'GET',
					headers: {
						'x-api-key': apiKey,
					},
				},
				env,
			)

			expect(res.status).toBe(404)
		})
	})

	describe('POST /recruit/join', () => {
		beforeEach(async () => {
			const db = getDb(env)

			await db.insert(users).values({ discordId: testCreatorId })
			await db.insert(users).values({ discordId: testUserId })
			await db.insert(recruitments).values({
				id: recruitmentId,
				guildId: testGuildId,
				channelId: testChannelId,
				messageId: testMessageId,
				creatorId: testCreatorId,
				type: 'normal',
				anonymous: false,
				status: 'open',
			})
		})

		it('募集に参加できる', async () => {
			const res = await app.request(
				'/recruit/join',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-api-key': apiKey,
					},
					body: JSON.stringify({
						recruitmentId,
						discordId: testUserId,
						mainRole: 'mid',
						subRole: 'top',
					}),
				},
				env,
			)

			expect(res.status).toBe(200)

			const data = (await res.json()) as {
				success: boolean
				count: number
				isFull: boolean
				participants: Array<{ discordId: string; mainRole: string; subRole: string }>
			}
			expect(data.success).toBe(true)
			expect(data.count).toBe(1)
			expect(data.isFull).toBe(false)
			expect(data.participants).toHaveLength(1)
			expect(data.participants[0]).toMatchObject({
				discordId: testUserId,
				mainRole: 'mid',
				subRole: 'top',
			})
		})

		it('存在しない募集は404を返す', async () => {
			const res = await app.request(
				'/recruit/join',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-api-key': apiKey,
					},
					body: JSON.stringify({
						recruitmentId: crypto.randomUUID(),
						discordId: testUserId,
					}),
				},
				env,
			)

			expect(res.status).toBe(404)
		})

		it('既に参加済みの場合は400を返す', async () => {
			// 先に参加
			await app.request(
				'/recruit/join',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-api-key': apiKey,
					},
					body: JSON.stringify({
						recruitmentId,
						discordId: testUserId,
					}),
				},
				env,
			)

			// 再度参加
			const res = await app.request(
				'/recruit/join',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-api-key': apiKey,
					},
					body: JSON.stringify({
						recruitmentId,
						discordId: testUserId,
					}),
				},
				env,
			)

			expect(res.status).toBe(400)
		})
	})

	describe('POST /recruit/leave', () => {
		beforeEach(async () => {
			const db = getDb(env)

			await db.insert(users).values({ discordId: testCreatorId })
			await db.insert(users).values({ discordId: testUserId })
			await db.insert(recruitments).values({
				id: recruitmentId,
				guildId: testGuildId,
				channelId: testChannelId,
				messageId: testMessageId,
				creatorId: testCreatorId,
				type: 'normal',
				anonymous: false,
				status: 'open',
			})
			await db.insert(recruitmentParticipants).values({
				id: crypto.randomUUID(),
				recruitmentId,
				discordId: testUserId,
				mainRole: 'adc',
				subRole: null,
			})
		})

		it('募集から離脱できる', async () => {
			const res = await app.request(
				'/recruit/leave',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-api-key': apiKey,
					},
					body: JSON.stringify({
						recruitmentId,
						discordId: testUserId,
					}),
				},
				env,
			)

			expect(res.status).toBe(200)

			const data = (await res.json()) as {
				success: boolean
				count: number
				participants: unknown[]
			}
			expect(data.success).toBe(true)
			expect(data.count).toBe(0)
			expect(data.participants).toHaveLength(0)
		})

		it('参加していない場合は400を返す', async () => {
			const res = await app.request(
				'/recruit/leave',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-api-key': apiKey,
					},
					body: JSON.stringify({
						recruitmentId,
						discordId: 'non-participant',
					}),
				},
				env,
			)

			expect(res.status).toBe(400)
		})
	})

	describe('DELETE /recruit/:id', () => {
		beforeEach(async () => {
			const db = getDb(env)

			await db.insert(users).values({ discordId: testCreatorId })
			await db.insert(recruitments).values({
				id: recruitmentId,
				guildId: testGuildId,
				channelId: testChannelId,
				messageId: testMessageId,
				creatorId: testCreatorId,
				type: 'normal',
				anonymous: false,
				status: 'open',
			})
		})

		it('募集を削除できる', async () => {
			const res = await app.request(
				`/recruit/${recruitmentId}`,
				{
					method: 'DELETE',
					headers: {
						'x-api-key': apiKey,
					},
				},
				env,
			)

			expect(res.status).toBe(200)

			const data = (await res.json()) as { success: boolean }
			expect(data.success).toBe(true)

			// DBから削除されているか確認
			const db = getDb(env)
			const deleted = await db.select().from(recruitments).where(eq(recruitments.id, recruitmentId)).get()
			expect(deleted).toBeUndefined()
		})
	})
})
