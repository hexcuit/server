import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
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
import { type DbVariables, dbMiddleware } from '@/middlewares/dbMiddleware'
import {
	calculateNewRating,
	calculateTeamAverageRating,
	formatRankDisplay,
	getRankDisplay,
	INITIAL_RATING,
	isInPlacement,
	PLACEMENT_GAMES,
} from '@/utils/elo'

// ========== スキーマ定義 ==========

const GetRatingsQuerySchema = z
	.object({
		guildId: z.string(),
		discordIds: z.array(z.string()).or(z.string().transform((val) => [val])),
	})
	.openapi('GetRatingsQuery')

const CreateRatingSchema = z
	.object({
		guildId: z.string(),
		discordId: z.string(),
	})
	.openapi('CreateRating')

const GetRankingQuerySchema = z
	.object({
		guildId: z.string(),
		limit: z
			.string()
			.optional()
			.transform((val) => (val ? Number.parseInt(val, 10) : 10)),
	})
	.openapi('GetRankingQuery')

const GetMatchHistoryQuerySchema = z
	.object({
		guildId: z.string(),
		discordId: z.string(),
		limit: z
			.string()
			.optional()
			.transform((val) => (val ? Number.parseInt(val, 10) : 5)),
	})
	.openapi('GetMatchHistoryQuery')

const TeamAssignmentSchema = z
	.object({
		team: z.enum(['blue', 'red']),
		role: z.enum(LOL_ROLES),
		rating: z.number(),
	})
	.openapi('TeamAssignment')

type TeamAssignment = z.infer<typeof TeamAssignmentSchema>
type TeamAssignments = Record<string, TeamAssignment>

const TeamAssignmentsSchema = z.record(z.string(), TeamAssignmentSchema)

const parseTeamAssignments = (json: string): TeamAssignments => {
	return TeamAssignmentsSchema.parse(JSON.parse(json))
}

const CreateMatchSchema = z
	.object({
		id: z.uuid(),
		guildId: z.string(),
		channelId: z.string(),
		messageId: z.string(),
		teamAssignments: z.record(z.string(), TeamAssignmentSchema),
	})
	.openapi('CreateMatch')

const VoteSchema = z
	.object({
		discordId: z.string(),
		vote: z.enum(['blue', 'red']),
	})
	.openapi('Vote')

const calculateMajority = (totalParticipants: number) => Math.ceil(totalParticipants / 2)

// ========== レスポンススキーマ ==========

const RankDetailSchema = z
	.object({
		tier: z.string(),
		division: z.string(),
		lp: z.number(),
	})
	.openapi('RankDetail')

const RatingItemSchema = z
	.object({
		discordId: z.string(),
		guildId: z.string(),
		rating: z.number().nullable(),
		wins: z.number().nullable(),
		losses: z.number().nullable(),
		placementGames: z.number().nullable(),
		isPlacement: z.boolean().nullable(),
		rank: z.string().nullable(),
		rankDetail: RankDetailSchema.nullable(),
	})
	.openapi('RatingItem')

const GetRatingsResponseSchema = z
	.object({
		ratings: z.array(RatingItemSchema),
	})
	.openapi('GetRatingsResponse')

const CreateRatingResponseSchema = z
	.object({
		success: z.boolean(),
		created: z.boolean(),
		rating: RatingItemSchema,
	})
	.openapi('CreateRatingResponse')

const RankingItemSchema = z
	.object({
		position: z.number(),
		discordId: z.string(),
		rating: z.number(),
		wins: z.number(),
		losses: z.number(),
		winRate: z.number(),
		rank: z.string(),
		rankDetail: RankDetailSchema,
	})
	.openapi('RankingItem')

const GetRankingResponseSchema = z
	.object({
		guildId: z.string(),
		rankings: z.array(RankingItemSchema),
	})
	.openapi('GetRankingResponse')

const CreateMatchResponseSchema = z
	.object({
		success: z.boolean(),
		matchId: z.string(),
	})
	.openapi('CreateMatchResponse')

const VoteItemSchema = z
	.object({
		discordId: z.string(),
		vote: z.enum(['blue', 'red']),
	})
	.openapi('VoteItem')

const MatchDetailSchema = z
	.object({
		id: z.string(),
		guildId: z.string(),
		channelId: z.string(),
		messageId: z.string(),
		status: z.string(),
		teamAssignments: z.record(z.string(), TeamAssignmentSchema),
		blueVotes: z.number(),
		redVotes: z.number(),
		createdAt: z.string(),
	})
	.openapi('MatchDetail')

const GetMatchResponseSchema = z
	.object({
		match: MatchDetailSchema,
		votes: z.array(VoteItemSchema),
		totalParticipants: z.number(),
		votesRequired: z.number(),
	})
	.openapi('GetMatchResponse')

const VoteResponseSchema = z
	.object({
		success: z.boolean(),
		changed: z.boolean(),
		blueVotes: z.number(),
		redVotes: z.number(),
		totalParticipants: z.number(),
		votesRequired: z.number(),
	})
	.openapi('VoteResponse')

const RatingChangeSchema = z
	.object({
		discordId: z.string(),
		team: z.enum(['blue', 'red']),
		ratingBefore: z.number(),
		ratingAfter: z.number(),
		change: z.number(),
		rank: z.string(),
	})
	.openapi('RatingChange')

const ConfirmMatchResponseSchema = z
	.object({
		success: z.boolean(),
		matchId: z.string(),
		winningTeam: z.enum(['blue', 'red']),
		ratingChanges: z.array(RatingChangeSchema),
	})
	.openapi('ConfirmMatchResponse')

const SuccessResponseSchema = z
	.object({
		success: z.boolean(),
	})
	.openapi('SuccessResponse')

const MatchHistoryItemSchema = z
	.object({
		matchId: z.string(),
		team: z.enum(['blue', 'red']),
		role: z.string(),
		ratingBefore: z.number(),
		ratingAfter: z.number(),
		change: z.number(),
		won: z.boolean(),
		createdAt: z.string(),
	})
	.openapi('MatchHistoryItem')

const GetMatchHistoryResponseSchema = z
	.object({
		guildId: z.string(),
		discordId: z.string(),
		history: z.array(MatchHistoryItemSchema),
	})
	.openapi('GetMatchHistoryResponse')

// ========== ルート定義 ==========

const getRatingsRoute = createRoute({
	method: 'get',
	path: '/rating',
	tags: ['Guild Rating'],
	summary: 'ギルドレート取得',
	description: 'Discord IDのリストから対応するギルドレート情報を取得します',
	request: { query: GetRatingsQuerySchema },
	responses: {
		200: {
			description: 'レート情報の取得に成功',
			content: { 'application/json': { schema: GetRatingsResponseSchema } },
		},
	},
})

const createRatingRoute = createRoute({
	method: 'post',
	path: '/rating',
	tags: ['Guild Rating'],
	summary: 'ギルドレート初期化',
	description: '初回参加時にギルドレートを初期化します',
	request: {
		body: { content: { 'application/json': { schema: CreateRatingSchema } } },
	},
	responses: {
		200: {
			description: 'レート初期化成功',
			content: { 'application/json': { schema: CreateRatingResponseSchema } },
		},
	},
})

const getRankingRoute = createRoute({
	method: 'get',
	path: '/ranking',
	tags: ['Guild Rating'],
	summary: 'ランキング取得',
	description: 'ギルドのレートランキングを取得します',
	request: { query: GetRankingQuerySchema },
	responses: {
		200: {
			description: 'ランキング取得成功',
			content: { 'application/json': { schema: GetRankingResponseSchema } },
		},
	},
})

const createMatchRoute = createRoute({
	method: 'post',
	path: '/match',
	tags: ['Guild Rating'],
	summary: '試合作成',
	description: '投票を開始するための試合を作成します',
	request: {
		body: { content: { 'application/json': { schema: CreateMatchSchema } } },
	},
	responses: {
		200: {
			description: '試合作成成功',
			content: { 'application/json': { schema: CreateMatchResponseSchema } },
		},
	},
})

const getMatchRoute = createRoute({
	method: 'get',
	path: '/match/{id}',
	tags: ['Guild Rating'],
	summary: '試合取得',
	description: '試合の詳細情報を取得します',
	request: {
		params: z.object({ id: z.string().uuid() }),
	},
	responses: {
		200: {
			description: '試合情報の取得に成功',
			content: { 'application/json': { schema: GetMatchResponseSchema } },
		},
	},
})

const voteMatchRoute = createRoute({
	method: 'post',
	path: '/match/{id}/vote',
	tags: ['Guild Rating'],
	summary: '投票',
	description: '試合の勝敗に投票します',
	request: {
		params: z.object({ id: z.string().uuid() }),
		body: { content: { 'application/json': { schema: VoteSchema } } },
	},
	responses: {
		200: {
			description: '投票成功',
			content: { 'application/json': { schema: VoteResponseSchema } },
		},
	},
})

const confirmMatchRoute = createRoute({
	method: 'post',
	path: '/match/{id}/confirm',
	tags: ['Guild Rating'],
	summary: '試合確定',
	description: '投票結果に基づいて試合を確定します',
	request: {
		params: z.object({ id: z.string().uuid() }),
	},
	responses: {
		200: {
			description: '試合確定成功',
			content: { 'application/json': { schema: ConfirmMatchResponseSchema } },
		},
	},
})

const cancelMatchRoute = createRoute({
	method: 'delete',
	path: '/match/{id}',
	tags: ['Guild Rating'],
	summary: '試合キャンセル',
	description: '投票中の試合をキャンセルします',
	request: {
		params: z.object({ id: z.string().uuid() }),
	},
	responses: {
		200: {
			description: 'キャンセル成功',
			content: { 'application/json': { schema: SuccessResponseSchema } },
		},
	},
})

const getMatchHistoryRoute = createRoute({
	method: 'get',
	path: '/match-history',
	tags: ['Guild Rating'],
	summary: '試合履歴取得',
	description: 'ユーザーの試合履歴を取得します',
	request: { query: GetMatchHistoryQuerySchema },
	responses: {
		200: {
			description: '履歴取得成功',
			content: { 'application/json': { schema: GetMatchHistoryResponseSchema } },
		},
	},
})

// ========== ルーター ==========

export const guildRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env; Variables: DbVariables }>()

guildRouter.use(corsMiddleware)
guildRouter.use(apiKeyMiddleware)
guildRouter.use(dbMiddleware)

// レート取得
guildRouter.openapi(getRatingsRoute, async (c) => {
	const { guildId, discordIds } = c.req.valid('query')
	const db = c.var.db

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

// レート初期化
guildRouter.openapi(createRatingRoute, async (c) => {
	const { guildId, discordId } = c.req.valid('json')
	const db = c.var.db

	await db.insert(users).values({ discordId }).onConflictDoNothing()

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
guildRouter.openapi(getRankingRoute, async (c) => {
	const { guildId, limit } = c.req.valid('query')
	const db = c.var.db

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

// 試合作成
guildRouter.openapi(createMatchRoute, async (c) => {
	const { id, guildId, channelId, messageId, teamAssignments } = c.req.valid('json')
	const db = c.var.db

	const discordIds = Object.keys(teamAssignments)
	for (const discordId of discordIds) {
		await db.insert(users).values({ discordId }).onConflictDoNothing()
	}

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
guildRouter.openapi(getMatchRoute, async (c) => {
	const matchId = c.req.valid('param').id
	const db = c.var.db

	const match = await db.select().from(guildPendingMatches).where(eq(guildPendingMatches.id, matchId)).get()

	if (!match) {
		throw new HTTPException(404, { message: 'Match not found' })
	}

	const votes = await db.select().from(guildMatchVotes).where(eq(guildMatchVotes.pendingMatchId, matchId))

	const teamAssignments = parseTeamAssignments(match.teamAssignments)

	const totalParticipants = Object.keys(teamAssignments).length
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
		totalParticipants,
		votesRequired: calculateMajority(totalParticipants),
	})
})

// 投票
guildRouter.openapi(voteMatchRoute, async (c) => {
	const matchId = c.req.valid('param').id
	const { discordId, vote } = c.req.valid('json')
	const db = c.var.db

	const match = await db.select().from(guildPendingMatches).where(eq(guildPendingMatches.id, matchId)).get()

	if (!match) {
		throw new HTTPException(404, { message: 'Match not found' })
	}

	if (match.status !== 'voting') {
		throw new HTTPException(400, { message: 'Match is not in voting state' })
	}

	const teamAssignments = parseTeamAssignments(match.teamAssignments)
	if (!teamAssignments[discordId]) {
		throw new HTTPException(403, { message: 'Not a participant' })
	}

	const existingVote = await db
		.select()
		.from(guildMatchVotes)
		.where(and(eq(guildMatchVotes.pendingMatchId, matchId), eq(guildMatchVotes.discordId, discordId)))
		.get()

	const totalParticipants = Object.keys(teamAssignments).length
	const votesRequired = calculateMajority(totalParticipants)

	if (existingVote) {
		if (existingVote.vote === vote) {
			return c.json({
				success: true,
				changed: false,
				blueVotes: match.blueVotes,
				redVotes: match.redVotes,
				totalParticipants,
				votesRequired,
			})
		}

		await db
			.update(guildMatchVotes)
			.set({ vote })
			.where(and(eq(guildMatchVotes.pendingMatchId, matchId), eq(guildMatchVotes.discordId, discordId)))

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
			totalParticipants,
			votesRequired,
		})
	}

	await db.insert(guildMatchVotes).values({
		pendingMatchId: matchId,
		discordId,
		vote,
	})

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
		totalParticipants,
		votesRequired,
	})
})

// 試合確定
guildRouter.openapi(confirmMatchRoute, async (c) => {
	const matchId = c.req.valid('param').id
	const db = c.var.db

	const match = await db.select().from(guildPendingMatches).where(eq(guildPendingMatches.id, matchId)).get()

	if (!match) {
		throw new HTTPException(404, { message: 'Match not found' })
	}

	if (match.status !== 'voting') {
		throw new HTTPException(400, { message: 'Match is not in voting state' })
	}

	const teamAssignments = parseTeamAssignments(match.teamAssignments)
	const totalParticipants = Object.keys(teamAssignments).length
	const votesRequired = calculateMajority(totalParticipants)

	const winningTeam = match.blueVotes >= votesRequired ? 'blue' : match.redVotes >= votesRequired ? 'red' : null

	if (!winningTeam) {
		throw new HTTPException(400, { message: 'Not enough votes' })
	}
	const participants = Object.entries(teamAssignments)

	const blueRatings = participants.filter(([, a]) => a.team === 'blue').map(([, a]) => a.rating)
	const redRatings = participants.filter(([, a]) => a.team === 'red').map(([, a]) => a.rating)
	const blueAverage = calculateTeamAverageRating(blueRatings)
	const redAverage = calculateTeamAverageRating(redRatings)

	const participantDiscordIds = participants.map(([discordId]) => discordId)
	const currentRatings = await db
		.select()
		.from(guildRatings)
		.where(and(eq(guildRatings.guildId, match.guildId), inArray(guildRatings.discordId, participantDiscordIds)))

	const ratingsMap = new Map(currentRatings.map((r) => [r.discordId, r]))

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

		const currentRating = ratingsMap.get(discordId)

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

	const statements: D1PreparedStatement[] = []

	const finalMatchId = crypto.randomUUID()
	statements.push(
		c.env.DB.prepare(
			'INSERT INTO guild_matches (id, guild_id, winning_team, created_at) VALUES (?, ?, ?, current_timestamp)',
		).bind(finalMatchId, match.guildId, winningTeam),
	)

	for (const rc of ratingChanges) {
		const participantId = crypto.randomUUID()
		statements.push(
			c.env.DB.prepare(
				'INSERT INTO guild_match_participants (id, match_id, discord_id, team, role, rating_before, rating_after) VALUES (?, ?, ?, ?, ?, ?, ?)',
			).bind(participantId, finalMatchId, rc.discordId, rc.team, rc.role, rc.ratingBefore, rc.ratingAfter),
		)
	}

	for (const rc of ratingChanges) {
		const won = rc.change > 0 || (rc.team === winningTeam && rc.change === 0)
		const existing = ratingsMap.get(rc.discordId)

		if (existing) {
			statements.push(
				c.env.DB.prepare(
					'UPDATE guild_ratings SET rating = ?, wins = ?, losses = ?, placement_games = ?, updated_at = current_timestamp WHERE guild_id = ? AND discord_id = ?',
				).bind(
					rc.ratingAfter,
					won ? existing.wins + 1 : existing.wins,
					won ? existing.losses : existing.losses + 1,
					Math.min(existing.placementGames + 1, PLACEMENT_GAMES),
					match.guildId,
					rc.discordId,
				),
			)
		} else {
			statements.push(
				c.env.DB.prepare(
					'INSERT INTO guild_ratings (guild_id, discord_id, rating, wins, losses, placement_games, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, current_timestamp, current_timestamp)',
				).bind(match.guildId, rc.discordId, rc.ratingAfter, won ? 1 : 0, won ? 0 : 1, 1),
			)
		}
	}

	statements.push(c.env.DB.prepare("UPDATE guild_pending_matches SET status = 'confirmed' WHERE id = ?").bind(matchId))

	const results = await c.env.DB.batch(statements)

	const failedResults = results.filter((r) => !r.success)
	if (failedResults.length > 0) {
		console.error('Batch execution failed:', failedResults)
		throw new HTTPException(500, { message: 'Failed to confirm match' })
	}

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
guildRouter.openapi(cancelMatchRoute, async (c) => {
	const matchId = c.req.valid('param').id
	const db = c.var.db

	const match = await db.select().from(guildPendingMatches).where(eq(guildPendingMatches.id, matchId)).get()

	if (!match) {
		throw new HTTPException(404, { message: 'Match not found' })
	}

	if (match.status !== 'voting') {
		throw new HTTPException(400, { message: 'Match is not in voting state' })
	}

	await db.update(guildPendingMatches).set({ status: 'cancelled' }).where(eq(guildPendingMatches.id, matchId))

	return c.json({ success: true })
})

// 試合履歴取得
guildRouter.openapi(getMatchHistoryRoute, async (c) => {
	const { guildId, discordId, limit } = c.req.valid('query')
	const db = c.var.db

	const participations = await db
		.select({
			matchId: guildMatchParticipants.matchId,
			team: guildMatchParticipants.team,
			role: guildMatchParticipants.role,
			ratingBefore: guildMatchParticipants.ratingBefore,
			ratingAfter: guildMatchParticipants.ratingAfter,
			winningTeam: guildMatches.winningTeam,
			createdAt: guildMatches.createdAt,
		})
		.from(guildMatchParticipants)
		.innerJoin(guildMatches, eq(guildMatchParticipants.matchId, guildMatches.id))
		.where(and(eq(guildMatches.guildId, guildId), eq(guildMatchParticipants.discordId, discordId)))
		.orderBy(desc(guildMatches.createdAt))
		.limit(limit)

	const history = participations.map((p) => ({
		matchId: p.matchId,
		team: p.team,
		role: p.role,
		ratingBefore: p.ratingBefore,
		ratingAfter: p.ratingAfter,
		change: p.ratingAfter - p.ratingBefore,
		won: p.team === p.winningTeam,
		createdAt: p.createdAt,
	}))

	return c.json({ guildId, discordId, history })
})
