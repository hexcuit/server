import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getPlatformProxy } from 'wrangler'
import { lolRank, users } from '@/db/schema'
import { app } from '@/index'
import { getDb } from '@/utils/db'

describe('LoL Rank API', () => {
	const testDiscordId = 'test-user-123'
	const apiKey = 'test-api-key'

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

		// テストデータをクリーンアップ
		await db.delete(lolRank).where(eq(lolRank.discordId, testDiscordId))
		await db.delete(users).where(eq(users.discordId, testDiscordId))
	})

	describe('POST /lol/rank', () => {
		it('新規ランクを登録できる', async () => {
			const res = await app.request(
				'/lol/rank',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-api-key': apiKey,
					},
					body: JSON.stringify({
						discordId: testDiscordId,
						tier: 'GOLD',
						division: 'II',
					}),
				},
				env,
			)

			expect(res.status).toBe(200)

			const data = (await res.json()) as { message: string }
			expect(data).toHaveProperty('message')
			expect(data.message).toContain('正常に登録')

			// DBに保存されているか確認
			const db = getDb(env)
			const saved = await db.select().from(lolRank).where(eq(lolRank.discordId, testDiscordId)).get()

			expect(saved).toBeDefined()
			expect(saved?.tier).toBe('GOLD')
			expect(saved?.division).toBe('II')
		})

		it('既存ランクを上書きできる', async () => {
			const db = getDb(env)

			// 初回登録
			await db.insert(users).values({ discordId: testDiscordId })
			await db.insert(lolRank).values({
				discordId: testDiscordId,
				tier: 'SILVER',
				division: 'I',
			})

			// 上書き
			const res = await app.request(
				'/lol/rank',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-api-key': apiKey,
					},
					body: JSON.stringify({
						discordId: testDiscordId,
						tier: 'PLATINUM',
						division: 'IV',
					}),
				},
				env,
			)

			expect(res.status).toBe(200)

			const updated = await db.select().from(lolRank).where(eq(lolRank.discordId, testDiscordId)).get()
			expect(updated?.tier).toBe('PLATINUM')
			expect(updated?.division).toBe('IV')
		})

		it('APIキーなしで403を返す', async () => {
			const res = await app.request(
				'/lol/rank',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						discordId: testDiscordId,
						tier: 'GOLD',
						division: 'II',
					}),
				},
				env,
			)

			expect(res.status).toBe(403)
		})

		it('不正なAPIキーで403を返す', async () => {
			const res = await app.request(
				'/lol/rank',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-api-key': 'invalid-key',
					},
					body: JSON.stringify({
						discordId: testDiscordId,
						tier: 'GOLD',
						division: 'II',
					}),
				},
				env,
			)

			expect(res.status).toBe(403)
		})

		it('バリデーションエラーで400を返す', async () => {
			const res = await app.request(
				'/lol/rank',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'x-api-key': apiKey,
					},
					body: JSON.stringify({
						discordId: testDiscordId,
						// tier, division が欠けている
					}),
				},
				env,
			)

			expect(res.status).toBe(400)
		})
	})

	describe('GET /lol/rank', () => {
		beforeEach(async () => {
			const db = getDb(env)

			// テストデータを準備
			await db.insert(users).values({ discordId: testDiscordId })
			await db.insert(lolRank).values({
				discordId: testDiscordId,
				tier: 'DIAMOND',
				division: 'III',
			})
		})

		it('登録済みユーザーのランクを取得できる', async () => {
			const res = await app.request(
				`/lol/rank?discordIds=${testDiscordId}`,
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
				ranks: Array<{ discordId: string; tier: string; division: string }>
			}
			expect(data).toHaveProperty('ranks')
			expect(data.ranks).toHaveLength(1)
			expect(data.ranks[0]).toEqual({
				discordId: testDiscordId,
				tier: 'DIAMOND',
				division: 'III',
			})
		})

		it('未登録ユーザーはUNRANKEDを返す', async () => {
			const unrankedId = 'unranked-user'

			const res = await app.request(
				`/lol/rank?discordIds=${unrankedId}`,
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
				ranks: Array<{ discordId: string; tier: string; division: string }>
			}
			expect(data.ranks).toHaveLength(1)
			expect(data.ranks[0]).toEqual({
				discordId: unrankedId,
				tier: 'UNRANKED',
				division: '',
			})
		})

		it('複数ユーザーのランクを一括取得できる', async () => {
			const db = getDb(env)

			const user2 = 'test-user-456'
			await db.insert(users).values({ discordId: user2 })
			await db.insert(lolRank).values({
				discordId: user2,
				tier: 'PLATINUM',
				division: 'I',
			})

			const res = await app.request(
				`/lol/rank?discordIds=${testDiscordId}&discordIds=${user2}`,
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
				ranks: Array<{ discordId: string; tier: string; division: string }>
			}
			expect(data.ranks).toHaveLength(2)

			// クリーンアップ
			await db.delete(lolRank).where(eq(lolRank.discordId, user2))
			await db.delete(users).where(eq(users.discordId, user2))
		})

		it('APIキーなしで403を返す', async () => {
			const res = await app.request(
				`/lol/rank?discordIds=${testDiscordId}`,
				{
					method: 'GET',
				},
				env,
			)

			expect(res.status).toBe(403)
		})
	})
})
