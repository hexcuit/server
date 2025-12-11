import { zValidator } from '@hono/zod-validator'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import { z } from 'zod'
import { guildRatings, users } from '@/db/schema'
import { apiKeyMiddleware } from '@/middlewares/apiKeyMiddleware'
import { corsMiddleware } from '@/middlewares/corsMiddleware'
import { formatRankDisplay, getRankDisplay, INITIAL_RATING, isInPlacement, PLACEMENT_GAMES } from '@/utils/elo'

// スキーマ定義
const GetRatingsQuerySchema = z.object({
	guildId: z.string(),
	discordIds: z.array(z.string()).or(z.string().transform((val) => [val])),
})

const CreateRatingSchema = z.object({
	guildId: z.string(),
	discordId: z.string(),
})

const GetRankingQuerySchema = z.object({
	guildId: z.string(),
	limit: z
		.string()
		.optional()
		.transform((val) => (val ? Number.parseInt(val, 10) : 10)),
})

// Guild関連のルーター
export const guildRouter = new Hono<{ Bindings: Cloudflare.Env }>()
	.use(corsMiddleware)
	.use(apiKeyMiddleware)

	// レート取得
	.get('/rating', zValidator('query', GetRatingsQuerySchema), async (c) => {
		const { guildId, discordIds } = c.req.valid('query')
		const db = drizzle(c.env.DB)

		const ratings = await db
			.select()
			.from(guildRatings)
			.where(and(eq(guildRatings.guildId, guildId), inArray(guildRatings.discordId, discordIds)))

		const ratingsMap = new Map(ratings.map((r) => [r.discordId, r]))

		const result = discordIds.map((discordId) => {
			const rating = ratingsMap.get(discordId)
			if (rating) {
				const rankDisplay = getRankDisplay(rating.rating)
				return {
					discordId,
					guildId,
					rating: rating.rating,
					wins: rating.wins,
					losses: rating.losses,
					placementGames: rating.placementGames,
					isPlacement: isInPlacement(rating.placementGames),
					rank: formatRankDisplay(rankDisplay),
					rankDetail: rankDisplay,
				}
			}
			// 未登録の場合はnullを返す
			return {
				discordId,
				guildId,
				rating: null,
				wins: null,
				losses: null,
				placementGames: null,
				isPlacement: null,
				rank: null,
				rankDetail: null,
			}
		})

		return c.json({ ratings: result })
	})

	// レート初期化（初回参加時）
	.post('/rating', zValidator('json', CreateRatingSchema), async (c) => {
		const { guildId, discordId } = c.req.valid('json')
		const db = drizzle(c.env.DB)

		// ユーザー存在確認・作成
		await db.insert(users).values({ discordId }).onConflictDoNothing()

		// 既存チェック
		const existing = await db
			.select()
			.from(guildRatings)
			.where(and(eq(guildRatings.guildId, guildId), eq(guildRatings.discordId, discordId)))
			.get()

		if (existing) {
			const rankDisplay = getRankDisplay(existing.rating)
			return c.json({
				success: true,
				created: false,
				rating: {
					discordId,
					guildId,
					rating: existing.rating,
					wins: existing.wins,
					losses: existing.losses,
					placementGames: existing.placementGames,
					isPlacement: isInPlacement(existing.placementGames),
					rank: formatRankDisplay(rankDisplay),
					rankDetail: rankDisplay,
				},
			})
		}

		// 新規作成
		await db.insert(guildRatings).values({
			guildId,
			discordId,
			rating: INITIAL_RATING,
			wins: 0,
			losses: 0,
			placementGames: 0,
		})

		const rankDisplay = getRankDisplay(INITIAL_RATING)
		return c.json({
			success: true,
			created: true,
			rating: {
				discordId,
				guildId,
				rating: INITIAL_RATING,
				wins: 0,
				losses: 0,
				placementGames: 0,
				isPlacement: true,
				rank: formatRankDisplay(rankDisplay),
				rankDetail: rankDisplay,
			},
		})
	})

	// ランキング取得
	.get('/ranking', zValidator('query', GetRankingQuerySchema), async (c) => {
		const { guildId, limit } = c.req.valid('query')
		const db = drizzle(c.env.DB)

		// プレイスメント完了者のみ、レート順でソート
		const rankings = await db
			.select()
			.from(guildRatings)
			.where(and(eq(guildRatings.guildId, guildId), eq(guildRatings.placementGames, PLACEMENT_GAMES)))
			.orderBy(desc(guildRatings.rating))
			.limit(limit)

		const result = rankings.map((r, index) => {
			const rankDisplay = getRankDisplay(r.rating)
			return {
				position: index + 1,
				discordId: r.discordId,
				rating: r.rating,
				wins: r.wins,
				losses: r.losses,
				winRate: r.wins + r.losses > 0 ? Math.round((r.wins / (r.wins + r.losses)) * 100) : 0,
				rank: formatRankDisplay(rankDisplay),
				rankDetail: rankDisplay,
			}
		})

		return c.json({ guildId, rankings: result })
	})
