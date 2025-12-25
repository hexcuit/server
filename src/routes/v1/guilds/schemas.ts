import { z } from '@hono/zod-openapi'
import { LOL_ROLES, LOL_TEAMS, MATCH_RESULTS, VOTE_OPTIONS } from '@/constants'

// ========== Path Parameters ==========

export const GuildParamSchema = z.object({
	guildId: z.string().openapi({ description: 'Guild ID' }),
})

export const MatchIdParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
		matchId: z.string().uuid().openapi({ description: 'Match UUID' }),
	})
	.openapi('MatchIdParam')

export const UserHistoryParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
		discordId: z.string().openapi({ description: 'Discord ID' }),
	})
	.openapi('UserHistoryParam')

// ========== Query Parameters ==========

export const GetRatingsQuerySchema = z
	.object({
		id: z.array(z.string()).or(z.string().transform((val) => [val])),
	})
	.openapi('GetRatingsQuery')

export const GetRankingQuerySchema = z
	.object({
		limit: z
			.string()
			.optional()
			.transform((val) => (val ? Number.parseInt(val, 10) : 10)),
	})
	.openapi('GetRankingQuery')

export const GetHistoryQuerySchema = z
	.object({
		limit: z
			.string()
			.optional()
			.transform((val) => (val ? Number.parseInt(val, 10) : 5)),
	})
	.openapi('GetHistoryQuery')

// ========== Request Body Schemas ==========

export const UpsertRatingBodySchema = z
	.object({
		discordId: z.string(),
	})
	.openapi('UpsertRatingBody')

export const TeamAssignmentSchema = z
	.object({
		team: z.enum(LOL_TEAMS),
		role: z.enum(LOL_ROLES),
		rating: z.number(),
	})
	.openapi('TeamAssignment')

export type TeamAssignment = z.infer<typeof TeamAssignmentSchema>
export type TeamAssignments = Record<string, TeamAssignment>

export const TeamAssignmentsSchema = z.record(z.string(), TeamAssignmentSchema)

export const CreateMatchBodySchema = z
	.object({
		id: z.uuid(),
		channelId: z.string(),
		messageId: z.string(),
		teamAssignments: z.record(z.string(), TeamAssignmentSchema),
	})
	.openapi('CreateMatchBody')

export const VoteBodySchema = z
	.object({
		discordId: z.string(),
		vote: z.enum(VOTE_OPTIONS),
	})
	.openapi('VoteBody')

// ========== Response Schemas ==========

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

export const UpsertRatingResponseSchema = z
	.object({
		created: z.boolean(),
		rating: RatingItemSchema,
	})
	.openapi('UpsertRatingResponse')

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
		matchId: z.string(),
	})
	.openapi('CreateMatchResponse')

export const VoteItemSchema = z
	.object({
		discordId: z.string(),
		vote: z.enum(VOTE_OPTIONS),
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
		drawVotes: z.number(),
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
		changed: z.boolean(),
		blueVotes: z.number(),
		redVotes: z.number(),
		drawVotes: z.number(),
		totalParticipants: z.number(),
		votesRequired: z.number(),
	})
	.openapi('VoteResponse')

export const RatingChangeSchema = z
	.object({
		discordId: z.string(),
		team: z.enum(LOL_TEAMS),
		ratingBefore: z.number(),
		ratingAfter: z.number(),
		change: z.number(),
		rank: z.string(),
	})
	.openapi('RatingChange')

export const ConfirmMatchResponseSchema = z
	.object({
		matchId: z.string(),
		winningTeam: z.enum(MATCH_RESULTS),
		ratingChanges: z.array(RatingChangeSchema),
	})
	.openapi('ConfirmMatchResponse')

export const DeleteMatchResponseSchema = z
	.object({
		deleted: z.boolean(),
	})
	.openapi('DeleteMatchResponse')

export const DeletedCountsSchema = z
	.object({
		userStats: z.number(),
		matches: z.number(),
		matchPlayers: z.number(),
		pendingMatches: z.number(),
	})
	.openapi('DeletedCounts')

export const ResetGuildStatsResponseSchema = z
	.object({
		deleted: z.boolean(),
		deletedCounts: DeletedCountsSchema,
	})
	.openapi('ResetGuildStatsResponse')

export const UserDeletedCountsSchema = z
	.object({
		userStats: z.number(),
		matchPlayers: z.number(),
	})
	.openapi('UserDeletedCounts')

export const ResetUserStatsResponseSchema = z
	.object({
		deleted: z.boolean(),
		deletedCounts: UserDeletedCountsSchema,
	})
	.openapi('ResetUserStatsResponse')

export const MatchHistoryItemSchema = z
	.object({
		matchId: z.string(),
		team: z.enum(LOL_TEAMS),
		role: z.enum(LOL_ROLES),
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

// ========== Helper Functions ==========

export const parseTeamAssignments = (json: string): TeamAssignments => {
	return TeamAssignmentsSchema.parse(JSON.parse(json))
}

export const calculateMajority = (totalParticipants: number) => Math.floor(totalParticipants / 2) + 1
