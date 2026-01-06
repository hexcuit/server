import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, count, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { z } from 'zod'
import { type LOL_TEAMS, MATCH_RESULTS, type MatchResult, type PlayerResult, VOTE_OPTIONS } from '@/constants'
import { K_FACTOR_NORMAL, K_FACTOR_PLACEMENT, PLACEMENT_GAMES } from '@/constants/rating'
import {
	guildMatches,
	guildMatchPlayers,
	guildMatchVotes,
	guildSettings,
	guildUserMatchHistory,
	guildUserStats,
} from '@/db/schema'
import { ensureGuild, ensureUser } from '@/utils/ensure'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
		matchId: z.string().openapi({ description: 'Match ID' }),
	})
	.openapi('VoteMatchParam')

const BodySchema = z
	.object({
		discordId: z.string(),
		vote: z.enum(VOTE_OPTIONS),
	})
	.openapi('VoteMatchBody')

const VotesSchema = z.object({
	blueVotes: z.number(),
	redVotes: z.number(),
	drawVotes: z.number(),
	totalParticipants: z.number(),
	votesRequired: z.number(),
})

const RatingChangeSchema = z.object({
	discordId: z.string(),
	team: z.enum(['BLUE', 'RED']),
	ratingBefore: z.number(),
	ratingAfter: z.number(),
	ratingChange: z.number(),
})

const VotingResponseSchema = z
	.object({
		status: z.literal('voting'),
		votes: VotesSchema,
	})
	.openapi('VoteMatchVotingResponse')

const ConfirmedResponseSchema = z
	.object({
		status: z.literal('confirmed'),
		winningTeam: z.enum(MATCH_RESULTS),
		ratingChanges: z.array(RatingChangeSchema),
	})
	.openapi('VoteMatchConfirmedResponse')

const ResponseSchema = z.union([VotingResponseSchema, ConfirmedResponseSchema])

const route = createRoute({
	method: 'post',
	path: '/v1/guilds/{guildId}/matches/{matchId}/vote',
	tags: ['Matches'],
	summary: 'Vote on match',
	description: 'Vote on match result. Auto-confirms when majority is reached.',
	request: {
		params: ParamSchema,
		body: { content: { 'application/json': { schema: BodySchema } } },
	},
	responses: {
		200: {
			description: 'Vote recorded or match confirmed',
			content: { 'application/json': { schema: ResponseSchema } },
		},
		400: {
			description: 'Match already confirmed or invalid vote',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
		404: {
			description: 'Match or player not found',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId, matchId } = c.req.valid('param')
	const { discordId, vote } = c.req.valid('json')
	const db = drizzle(c.env.DB)

	// Ensure guild and user exist
	await ensureGuild(db, guildId)
	await ensureUser(db, discordId)

	// Get match
	const match = await db
		.select()
		.from(guildMatches)
		.where(and(eq(guildMatches.id, matchId), eq(guildMatches.guildId, guildId)))
		.get()

	if (!match) {
		return c.json({ message: 'Match not found' }, 404)
	}

	if (match.status === 'confirmed') {
		return c.json({ message: 'Match already confirmed' }, 400)
	}

	// Check if player is in match
	const player = await db
		.select()
		.from(guildMatchPlayers)
		.where(and(eq(guildMatchPlayers.matchId, matchId), eq(guildMatchPlayers.discordId, discordId)))
		.get()

	if (!player) {
		return c.json({ message: 'Player not in match' }, 404)
	}

	// Get existing vote
	const existingVote = await db
		.select()
		.from(guildMatchVotes)
		.where(and(eq(guildMatchVotes.matchId, matchId), eq(guildMatchVotes.discordId, discordId)))
		.get()

	if (existingVote) {
		if (existingVote.vote !== vote) {
			// Calculate vote count adjustments
			const blueAdjust = (vote === 'BLUE' ? 1 : 0) - (existingVote.vote === 'BLUE' ? 1 : 0)
			const redAdjust = (vote === 'RED' ? 1 : 0) - (existingVote.vote === 'RED' ? 1 : 0)
			const drawAdjust = (vote === 'DRAW' ? 1 : 0) - (existingVote.vote === 'DRAW' ? 1 : 0)

			await db.batch([
				db
					.update(guildMatchVotes)
					.set({ vote })
					.where(and(eq(guildMatchVotes.matchId, matchId), eq(guildMatchVotes.discordId, discordId))),
				db
					.update(guildMatches)
					.set({
						blueVotes: sql`${guildMatches.blueVotes} + ${blueAdjust}`,
						redVotes: sql`${guildMatches.redVotes} + ${redAdjust}`,
						drawVotes: sql`${guildMatches.drawVotes} + ${drawAdjust}`,
					})
					.where(eq(guildMatches.id, matchId)),
			])
		}
	} else {
		await db.batch([
			db.insert(guildMatchVotes).values({ matchId, discordId, vote }),
			db
				.update(guildMatches)
				.set({
					blueVotes: sql`${guildMatches.blueVotes} + ${vote === 'BLUE' ? 1 : 0}`,
					redVotes: sql`${guildMatches.redVotes} + ${vote === 'RED' ? 1 : 0}`,
					drawVotes: sql`${guildMatches.drawVotes} + ${vote === 'DRAW' ? 1 : 0}`,
				})
				.where(eq(guildMatches.id, matchId)),
		])
	}

	// Get updated match and participant count
	const [updatedMatch, participantCount] = await Promise.all([
		db.select().from(guildMatches).where(eq(guildMatches.id, matchId)).get(),
		db.select({ total: count() }).from(guildMatchPlayers).where(eq(guildMatchPlayers.matchId, matchId)),
	])

	if (!updatedMatch) {
		return c.json({ message: 'Match not found' }, 404)
	}

	const totalParticipants = participantCount[0]?.total ?? 0
	const votesRequired = Math.ceil(totalParticipants / 2) + 1

	const { blueVotes, redVotes, drawVotes } = updatedMatch

	// Check if majority reached
	let winningTeam: MatchResult | null = null
	if (blueVotes >= votesRequired) {
		winningTeam = 'BLUE'
	} else if (redVotes >= votesRequired) {
		winningTeam = 'RED'
	} else if (drawVotes >= votesRequired) {
		winningTeam = 'DRAW'
	}

	// If no majority, return voting status
	if (!winningTeam) {
		return c.json(
			{
				status: 'voting' as const,
				votes: {
					blueVotes,
					redVotes,
					drawVotes,
					totalParticipants,
					votesRequired,
				},
			},
			200,
		)
	}

	// Majority reached - confirm match and calculate ratings
	const settings = await db.select().from(guildSettings).where(eq(guildSettings.guildId, guildId)).get()
	const kFactorNormal = settings?.kFactor ?? K_FACTOR_NORMAL
	const kFactorPlacement = settings?.kFactorPlacement ?? K_FACTOR_PLACEMENT
	const placementGamesRequired = settings?.placementGamesRequired ?? PLACEMENT_GAMES

	const players = await db.select().from(guildMatchPlayers).where(eq(guildMatchPlayers.matchId, matchId))
	const playerStats = await db.select().from(guildUserStats).where(eq(guildUserStats.guildId, guildId))
	const statsMap = new Map(playerStats.map((s) => [s.discordId, s]))

	const ratingChanges: Array<{
		discordId: string
		team: (typeof LOL_TEAMS)[number]
		ratingBefore: number
		ratingAfter: number
		ratingChange: number
	}> = []
	const statsUpdates: {
		discordId: string
		rating: number
		wins: number
		losses: number
		placementGames: number
		currentStreak: number
		peakRating: number
		lastPlayedAt: Date
	}[] = []
	const historyInserts: (typeof guildUserMatchHistory.$inferInsert)[] = []

	const now = new Date()

	for (const matchPlayer of players) {
		const currentStats = statsMap.get(matchPlayer.discordId)
		if (!currentStats) continue

		const isPlacement = currentStats.placementGames < placementGamesRequired
		const kFactor = isPlacement ? kFactorPlacement : kFactorNormal

		let result: PlayerResult
		let ratingChange: number

		if (winningTeam === 'DRAW') {
			result = 'DRAW'
			ratingChange = 0
		} else if (matchPlayer.team === winningTeam) {
			result = 'WIN'
			ratingChange = Math.round(kFactor / 2)
		} else {
			result = 'LOSE'
			ratingChange = -Math.round(kFactor / 2)
		}

		const ratingAfter = matchPlayer.ratingBefore + ratingChange
		const newWins = result === 'WIN' ? currentStats.wins + 1 : currentStats.wins
		const newLosses = result === 'LOSE' ? currentStats.losses + 1 : currentStats.losses
		const newPlacementGames = isPlacement ? currentStats.placementGames + 1 : currentStats.placementGames
		const newStreak =
			result === 'WIN'
				? currentStats.currentStreak > 0
					? currentStats.currentStreak + 1
					: 1
				: result === 'LOSE'
					? currentStats.currentStreak < 0
						? currentStats.currentStreak - 1
						: -1
					: 0
		const newPeakRating = Math.max(currentStats.peakRating, ratingAfter)

		statsUpdates.push({
			discordId: matchPlayer.discordId,
			rating: ratingAfter,
			wins: newWins,
			losses: newLosses,
			placementGames: newPlacementGames,
			currentStreak: newStreak,
			peakRating: newPeakRating,
			lastPlayedAt: now,
		})

		historyInserts.push({
			guildId,
			discordId: matchPlayer.discordId,
			matchId,
			result,
			ratingChange,
			ratingAfter,
		})

		ratingChanges.push({
			discordId: matchPlayer.discordId,
			team: matchPlayer.team,
			ratingBefore: matchPlayer.ratingBefore,
			ratingAfter,
			ratingChange,
		})
	}

	// Execute all updates atomically
	await db.batch([
		db
			.update(guildMatches)
			.set({
				status: 'confirmed',
				winningTeam,
				confirmedAt: now,
			})
			.where(eq(guildMatches.id, matchId)),
		...statsUpdates.map((update) =>
			db
				.update(guildUserStats)
				.set({
					rating: update.rating,
					wins: update.wins,
					losses: update.losses,
					placementGames: update.placementGames,
					currentStreak: update.currentStreak,
					peakRating: update.peakRating,
					lastPlayedAt: update.lastPlayedAt,
				})
				.where(and(eq(guildUserStats.guildId, guildId), eq(guildUserStats.discordId, update.discordId))),
		),
		...(historyInserts.length > 0 ? [db.insert(guildUserMatchHistory).values(historyInserts)] : []),
	])

	return c.json(
		{
			status: 'confirmed' as const,
			winningTeam,
			ratingChanges,
		},
		200,
	)
})

export default app
