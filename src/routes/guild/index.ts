import { zValidator } from '@hono/zod-validator'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import { z } from 'zod'
import {
	guildMatches,
	guildMatchParticipants,
	guildMatchVotes,
	guildPendingMatches,
	guildRatings,
	LOL_ROLES,
	users,
} from '@/db/schema'
import { apiKeyMiddleware } from '@/middlewares/apiKeyMiddleware'
import { corsMiddleware } from '@/middlewares/corsMiddleware'
import {
	calculateNewRating,
	calculateTeamAverageRating,
	formatRankDisplay,
	getRankDisplay,
	INITIAL_RATING,
	isInPlacement,
	PLACEMENT_GAMES,
} from '@/utils/elo'

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

// チーム振り分け用の型
const TeamAssignmentSchema = z.object({
	team: z.enum(['blue', 'red']),
	role: z.enum(LOL_ROLES),
	rating: z.number(),
})

type TeamAssignment = z.infer<typeof TeamAssignmentSchema>
type TeamAssignments = Record<string, TeamAssignment>

// 試合作成スキーマ
const CreateMatchSchema = z.object({
	id: z.uuid(),
	guildId: z.string(),
	channelId: z.string(),
	messageId: z.string(),
	teamAssignments: z.record(z.string(), TeamAssignmentSchema), // { discordId: { team, role, rating } }
})

// 投票スキーマ
const VoteSchema = z.object({
	discordId: z.string(),
	vote: z.enum(['blue', 'red']),
})

// 投票結果確定に必要な票数
const VOTES_REQUIRED = 6

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

	// 試合作成（投票開始）
	.post('/match', zValidator('json', CreateMatchSchema), async (c) => {
		const { id, guildId, channelId, messageId, teamAssignments } = c.req.valid('json')
		const db = drizzle(c.env.DB)

		// 参加者のユーザーレコードを確認・作成
		const discordIds = Object.keys(teamAssignments)
		for (const discordId of discordIds) {
			await db.insert(users).values({ discordId }).onConflictDoNothing()
		}

		// pending match を作成
		await db.insert(guildPendingMatches).values({
			id,
			guildId,
			channelId,
			messageId,
			status: 'voting',
			teamAssignments: JSON.stringify(teamAssignments),
			blueVotes: 0,
			redVotes: 0,
		})

		return c.json({ success: true, matchId: id })
	})

	// 試合取得
	.get('/match/:id', async (c) => {
		const matchId = c.req.param('id')
		const db = drizzle(c.env.DB)

		const match = await db.select().from(guildPendingMatches).where(eq(guildPendingMatches.id, matchId)).get()

		if (!match) {
			return c.json({ error: 'Match not found' }, 404)
		}

		const votes = await db.select().from(guildMatchVotes).where(eq(guildMatchVotes.pendingMatchId, matchId))

		const teamAssignments = JSON.parse(match.teamAssignments) as TeamAssignments

		return c.json({
			match: {
				id: match.id,
				guildId: match.guildId,
				channelId: match.channelId,
				messageId: match.messageId,
				status: match.status,
				teamAssignments,
				blueVotes: match.blueVotes,
				redVotes: match.redVotes,
				createdAt: match.createdAt,
			},
			votes: votes.map((v) => ({ discordId: v.discordId, vote: v.vote })),
			votesRequired: VOTES_REQUIRED,
		})
	})

	// 投票
	.post('/match/:id/vote', zValidator('json', VoteSchema), async (c) => {
		const matchId = c.req.param('id')
		const { discordId, vote } = c.req.valid('json')
		const db = drizzle(c.env.DB)

		// 試合存在確認
		const match = await db.select().from(guildPendingMatches).where(eq(guildPendingMatches.id, matchId)).get()

		if (!match) {
			return c.json({ error: 'Match not found' }, 404)
		}

		if (match.status !== 'voting') {
			return c.json({ error: 'Match is not in voting state' }, 400)
		}

		// 参加者確認
		const teamAssignments = JSON.parse(match.teamAssignments) as TeamAssignments
		if (!teamAssignments[discordId]) {
			return c.json({ error: 'Not a participant' }, 403)
		}

		// 既存投票確認
		const existingVote = await db
			.select()
			.from(guildMatchVotes)
			.where(and(eq(guildMatchVotes.pendingMatchId, matchId), eq(guildMatchVotes.discordId, discordId)))
			.get()

		if (existingVote) {
			// 同じ投票なら何もしない
			if (existingVote.vote === vote) {
				return c.json({
					success: true,
					changed: false,
					blueVotes: match.blueVotes,
					redVotes: match.redVotes,
				})
			}

			// 投票変更
			await db
				.update(guildMatchVotes)
				.set({ vote })
				.where(and(eq(guildMatchVotes.pendingMatchId, matchId), eq(guildMatchVotes.discordId, discordId)))

			// カウント更新
			const newBlueVotes = vote === 'blue' ? match.blueVotes + 1 : match.blueVotes - 1
			const newRedVotes = vote === 'red' ? match.redVotes + 1 : match.redVotes - 1

			await db
				.update(guildPendingMatches)
				.set({ blueVotes: newBlueVotes, redVotes: newRedVotes })
				.where(eq(guildPendingMatches.id, matchId))

			return c.json({
				success: true,
				changed: true,
				blueVotes: newBlueVotes,
				redVotes: newRedVotes,
			})
		}

		// 新規投票
		await db.insert(guildMatchVotes).values({
			pendingMatchId: matchId,
			discordId,
			vote,
		})

		// カウント更新
		const newBlueVotes = vote === 'blue' ? match.blueVotes + 1 : match.blueVotes
		const newRedVotes = vote === 'red' ? match.redVotes + 1 : match.redVotes

		await db
			.update(guildPendingMatches)
			.set({ blueVotes: newBlueVotes, redVotes: newRedVotes })
			.where(eq(guildPendingMatches.id, matchId))

		return c.json({
			success: true,
			changed: true,
			blueVotes: newBlueVotes,
			redVotes: newRedVotes,
		})
	})

	// 試合確定
	.post('/match/:id/confirm', async (c) => {
		const matchId = c.req.param('id')
		const db = drizzle(c.env.DB)

		// 試合存在確認
		const match = await db.select().from(guildPendingMatches).where(eq(guildPendingMatches.id, matchId)).get()

		if (!match) {
			return c.json({ error: 'Match not found' }, 404)
		}

		if (match.status !== 'voting') {
			return c.json({ error: 'Match is not in voting state' }, 400)
		}

		// 投票数確認
		const winningTeam = match.blueVotes >= VOTES_REQUIRED ? 'blue' : match.redVotes >= VOTES_REQUIRED ? 'red' : null

		if (!winningTeam) {
			return c.json(
				{
					error: 'Not enough votes',
					blueVotes: match.blueVotes,
					redVotes: match.redVotes,
					required: VOTES_REQUIRED,
				},
				400,
			)
		}

		const teamAssignments = JSON.parse(match.teamAssignments) as TeamAssignments
		const participants = Object.entries(teamAssignments)

		// チームごとのレートを計算
		const blueRatings = participants.filter(([, a]) => a.team === 'blue').map(([, a]) => a.rating)
		const redRatings = participants.filter(([, a]) => a.team === 'red').map(([, a]) => a.rating)
		const blueAverage = calculateTeamAverageRating(blueRatings)
		const redAverage = calculateTeamAverageRating(redRatings)

		// 各参加者の新レートを計算
		const ratingChanges: Array<{
			discordId: string
			team: 'blue' | 'red'
			role: string
			ratingBefore: number
			ratingAfter: number
			change: number
		}> = []

		for (const [discordId, assignment] of participants) {
			const isBlue = assignment.team === 'blue'
			const won = (isBlue && winningTeam === 'blue') || (!isBlue && winningTeam === 'red')
			const opponentAverage = isBlue ? redAverage : blueAverage

			// プレイスメント状況を確認
			const currentRating = await db
				.select()
				.from(guildRatings)
				.where(and(eq(guildRatings.guildId, match.guildId), eq(guildRatings.discordId, discordId)))
				.get()

			const placementGames = currentRating?.placementGames ?? 0
			const isPlacement = isInPlacement(placementGames)

			const newRating = calculateNewRating(assignment.rating, opponentAverage, won, isPlacement)

			ratingChanges.push({
				discordId,
				team: assignment.team,
				role: assignment.role,
				ratingBefore: assignment.rating,
				ratingAfter: newRating,
				change: newRating - assignment.rating,
			})
		}

		// トランザクション的に処理
		// 1. guildMatches に試合記録を作成
		const finalMatchId = crypto.randomUUID()
		await db.insert(guildMatches).values({
			id: finalMatchId,
			guildId: match.guildId,
			winningTeam,
		})

		// 2. guildMatchParticipants に参加者を記録
		for (const rc of ratingChanges) {
			await db.insert(guildMatchParticipants).values({
				id: crypto.randomUUID(),
				matchId: finalMatchId,
				discordId: rc.discordId,
				team: rc.team,
				role: rc.role as 'top' | 'jungle' | 'mid' | 'adc' | 'support',
				ratingBefore: rc.ratingBefore,
				ratingAfter: rc.ratingAfter,
			})
		}

		// 3. guildRatings を更新
		for (const rc of ratingChanges) {
			const won = rc.change > 0 || (rc.team === winningTeam && rc.change === 0)

			const existing = await db
				.select()
				.from(guildRatings)
				.where(and(eq(guildRatings.guildId, match.guildId), eq(guildRatings.discordId, rc.discordId)))
				.get()

			if (existing) {
				await db
					.update(guildRatings)
					.set({
						rating: rc.ratingAfter,
						wins: won ? existing.wins + 1 : existing.wins,
						losses: won ? existing.losses : existing.losses + 1,
						placementGames: Math.min(existing.placementGames + 1, PLACEMENT_GAMES),
					})
					.where(and(eq(guildRatings.guildId, match.guildId), eq(guildRatings.discordId, rc.discordId)))
			} else {
				// 初回参加（レーティング未登録の場合）
				await db.insert(guildRatings).values({
					guildId: match.guildId,
					discordId: rc.discordId,
					rating: rc.ratingAfter,
					wins: won ? 1 : 0,
					losses: won ? 0 : 1,
					placementGames: 1,
				})
			}
		}

		// 4. pendingMatch のステータスを更新
		await db.update(guildPendingMatches).set({ status: 'confirmed' }).where(eq(guildPendingMatches.id, matchId))

		return c.json({
			success: true,
			matchId: finalMatchId,
			winningTeam,
			ratingChanges: ratingChanges.map((rc) => ({
				discordId: rc.discordId,
				team: rc.team,
				ratingBefore: rc.ratingBefore,
				ratingAfter: rc.ratingAfter,
				change: rc.change,
				rank: formatRankDisplay(getRankDisplay(rc.ratingAfter)),
			})),
		})
	})

	// 試合キャンセル
	.delete('/match/:id', async (c) => {
		const matchId = c.req.param('id')
		const db = drizzle(c.env.DB)

		// 試合存在確認
		const match = await db.select().from(guildPendingMatches).where(eq(guildPendingMatches.id, matchId)).get()

		if (!match) {
			return c.json({ error: 'Match not found' }, 404)
		}

		if (match.status !== 'voting') {
			return c.json({ error: 'Match is not in voting state' }, 400)
		}

		// ステータスを cancelled に更新
		await db.update(guildPendingMatches).set({ status: 'cancelled' }).where(eq(guildPendingMatches.id, matchId))

		return c.json({ success: true })
	})
