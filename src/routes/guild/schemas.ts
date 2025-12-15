import { z } from '@hono/zod-openapi'
import { LOL_ROLES } from '@/db/schema'

// ========== リクエストスキーマ ==========

export const GetRatingsQuerySchema = z
	.object({
		guildId: z.string(),
		discordIds: z.array(z.string()).or(z.string().transform((val) => [val])),
	})
	.openapi('GetRatingsQuery')

export const CreateRatingSchema = z
	.object({
		guildId: z.string(),
		discordId: z.string(),
	})
	.openapi('CreateRating')

export const GetRankingQuerySchema = z
	.object({
		guildId: z.string(),
		limit: z
			.string()
			.optional()
			.transform((val) => (val ? Number.parseInt(val, 10) : 10)),
	})
	.openapi('GetRankingQuery')

export const GetMatchHistoryQuerySchema = z
	.object({
		guildId: z.string(),
		discordId: z.string(),
		limit: z
			.string()
			.optional()
			.transform((val) => (val ? Number.parseInt(val, 10) : 5)),
	})
	.openapi('GetMatchHistoryQuery')

export const TeamAssignmentSchema = z
	.object({
		team: z.enum(['blue', 'red']),
		role: z.enum(LOL_ROLES),
		rating: z.number(),
	})
	.openapi('TeamAssignment')

export type TeamAssignment = z.infer<typeof TeamAssignmentSchema>
export type TeamAssignments = Record<string, TeamAssignment>

export const TeamAssignmentsSchema = z.record(z.string(), TeamAssignmentSchema)

export const CreateMatchSchema = z
	.object({
		id: z.uuid(),
		guildId: z.string(),
		channelId: z.string(),
		messageId: z.string(),
		teamAssignments: z.record(z.string(), TeamAssignmentSchema),
	})
	.openapi('CreateMatch')

export const VoteSchema = z
	.object({
		discordId: z.string(),
		vote: z.enum(['blue', 'red']),
	})
	.openapi('Vote')

// ========== レスポンススキーマ ==========

export const RankDetailSchema = z
	.object({
		tier: z.string(),
		division: z.string().nullable(),
		lp: z.number(),
	})
	.openapi('RankDetail')

export const RatingItemSchema = z
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

export const GetRatingsResponseSchema = z
	.object({
		ratings: z.array(RatingItemSchema),
	})
	.openapi('GetRatingsResponse')

export const CreateRatingResponseSchema = z
	.object({
		success: z.boolean(),
		created: z.boolean(),
		rating: RatingItemSchema,
	})
	.openapi('CreateRatingResponse')

export const RankingItemSchema = z
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

export const GetRankingResponseSchema = z
	.object({
		guildId: z.string(),
		rankings: z.array(RankingItemSchema),
	})
	.openapi('GetRankingResponse')

export const CreateMatchResponseSchema = z
	.object({
		success: z.boolean(),
		matchId: z.string(),
	})
	.openapi('CreateMatchResponse')

export const VoteItemSchema = z
	.object({
		discordId: z.string(),
		vote: z.enum(['blue', 'red']),
	})
	.openapi('VoteItem')

export const MatchDetailSchema = z
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

export const GetMatchResponseSchema = z
	.object({
		match: MatchDetailSchema,
		votes: z.array(VoteItemSchema),
		totalParticipants: z.number(),
		votesRequired: z.number(),
	})
	.openapi('GetMatchResponse')

export const VoteResponseSchema = z
	.object({
		success: z.boolean(),
		changed: z.boolean(),
		blueVotes: z.number(),
		redVotes: z.number(),
		totalParticipants: z.number(),
		votesRequired: z.number(),
	})
	.openapi('VoteResponse')

export const RatingChangeSchema = z
	.object({
		discordId: z.string(),
		team: z.enum(['blue', 'red']),
		ratingBefore: z.number(),
		ratingAfter: z.number(),
		change: z.number(),
		rank: z.string(),
	})
	.openapi('RatingChange')

export const ConfirmMatchResponseSchema = z
	.object({
		success: z.boolean(),
		matchId: z.string(),
		winningTeam: z.enum(['blue', 'red']),
		ratingChanges: z.array(RatingChangeSchema),
	})
	.openapi('ConfirmMatchResponse')

export const SuccessResponseSchema = z
	.object({
		success: z.boolean(),
	})
	.openapi('SuccessResponse')

export const MatchHistoryItemSchema = z
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

export const GetMatchHistoryResponseSchema = z
	.object({
		guildId: z.string(),
		discordId: z.string(),
		history: z.array(MatchHistoryItemSchema),
	})
	.openapi('GetMatchHistoryResponse')

// ========== ヘルパー関数 ==========

export const parseTeamAssignments = (json: string): TeamAssignments => {
	return TeamAssignmentsSchema.parse(JSON.parse(json))
}

export const calculateMajority = (totalParticipants: number) => Math.ceil(totalParticipants / 2)
