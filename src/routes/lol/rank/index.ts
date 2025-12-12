import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { inArray } from 'drizzle-orm'
import { lolRank, lolRankZodSchema, users } from '@/db/schema'
import { apiKeyMiddleware } from '@/middlewares/apiKeyMiddleware'
import { corsMiddleware } from '@/middlewares/corsMiddleware'
import { type DbVariables, dbMiddleware } from '@/middlewares/dbMiddleware'

// リクエスト/レスポンススキーマ
const RankSchema = lolRankZodSchema.openapi('LolRank')

const GetRanksQuerySchema = z
	.object({
		discordIds: z.array(z.string()).or(z.string().transform((val) => [val])),
	})
	.openapi('GetRanksQuery')

const RankItemSchema = z
	.object({
		discordId: z.string(),
		tier: z.string(),
		division: z.string(),
	})
	.openapi('RankItem')

const GetRanksResponseSchema = z
	.object({
		ranks: z.array(RankItemSchema),
	})
	.openapi('GetRanksResponse')

const CreateRankResponseSchema = z
	.object({
		message: z.string(),
	})
	.openapi('CreateRankResponse')

// ルート定義
const createRankRoute = createRoute({
	method: 'post',
	path: '/',
	tags: ['LoL Rank'],
	summary: 'LoLランクを登録',
	description: 'Discord IDに紐づくLoLランク情報を登録・更新します',
	request: {
		body: {
			content: {
				'application/json': {
					schema: RankSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'ランク登録成功',
			content: {
				'application/json': {
					schema: CreateRankResponseSchema,
				},
			},
		},
	},
})

const getRanksRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['LoL Rank'],
	summary: 'LoLランク情報を取得',
	description: 'Discord IDのリストから対応するLoLランク情報を取得します',
	request: {
		query: GetRanksQuerySchema,
	},
	responses: {
		200: {
			description: 'ランク情報の取得に成功',
			content: {
				'application/json': {
					schema: GetRanksResponseSchema,
				},
			},
		},
	},
})

// ルーター
export const rankRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env; Variables: DbVariables }>()

// ミドルウェア適用
rankRouter.use(corsMiddleware)
rankRouter.use(apiKeyMiddleware)
rankRouter.use(dbMiddleware)

// ルート登録
rankRouter.openapi(createRankRoute, async (c) => {
	const { discordId, tier, division } = c.req.valid('json')

	const db = c.var.db

	await db
		.insert(users)
		.values({
			discordId,
		})
		.onConflictDoNothing()

	await db.insert(lolRank).values({ discordId, tier, division }).onConflictDoUpdate({
		target: lolRank.discordId,
		set: { tier, division },
	})

	return c.json({ message: 'ランクが正常に登録されました。' })
})

rankRouter.openapi(getRanksRoute, async (c) => {
	const { discordIds } = c.req.valid('query')

	const db = c.var.db

	const ranks = await db.select().from(lolRank).where(inArray(lolRank.discordId, discordIds))

	const ranksMap = new Map(ranks.map((rank) => [rank.discordId, rank]))

	const result = discordIds.map((discordId) => {
		const rank = ranksMap.get(discordId)
		return (
			rank || {
				discordId,
				tier: 'UNRANKED',
				division: '',
			}
		)
	})

	return c.json({ ranks: result })
})
