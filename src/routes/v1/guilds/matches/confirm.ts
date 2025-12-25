import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq, inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { guildMatches, guildMatchPlayers, guildPendingMatches, guildUserStats } from '@/db/schema'
import {
	calculateNewRating,
	calculateTeamAverageRating,
	formatRankDisplay,
	getRankDisplay,
	isInPlacement,
	PLACEMENT_GAMES,
} from '@/utils/elo'
import { ErrorResponseSchema } from '@/utils/schemas'
import { ConfirmMatchResponseSchema, calculateMajority, MatchIdParamSchema, parseTeamAssignments } from '../schemas'

const route = createRoute({
	method: 'post',
	path: '/v1/guilds/{guildId}/matches/{matchId}/confirm',
	tags: ['Guild Matches'],
	summary: 'Confirm match',
	description: 'Confirm match based on voting results',
	request: {
		params: MatchIdParamSchema,
	},
	responses: {
		200: {
			description: 'Match confirmed',
			content: { 'application/json': { schema: ConfirmMatchResponseSchema } },
		},
		400: {
			description: 'Match is not in voting state or not enough votes',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
		404: {
			description: 'Match not found',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
		500: {
			description: 'Internal server error',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { matchId } = c.req.valid('param')
	const db = drizzle(c.env.DB)

	const match = await db.select().from(guildPendingMatches).where(eq(guildPendingMatches.id, matchId)).get()

	if (!match) {
		return c.json({ message: 'Match not found' }, 404)
	}

	if (match.status !== 'voting') {
		return c.json({ message: 'Match is not in voting state' }, 400)
	}

	const teamAssignments = parseTeamAssignments(match.teamAssignments)
	const totalParticipants = Object.keys(teamAssignments).length
	const votesRequired = calculateMajority(totalParticipants)
	const totalVotes = match.blueVotes + match.redVotes + match.drawVotes

	// Determine winning team with 2-phase logic
	const determineWinningTeam = (): 'BLUE' | 'RED' | 'DRAW' | null => {
		// Phase 1: Early confirmation with majority
		if (match.blueVotes >= votesRequired) return 'BLUE'
		if (match.redVotes >= votesRequired) return 'RED'
		if (match.drawVotes >= votesRequired) return 'DRAW'

		// Phase 2: After all votes, determine by plurality (ties = draw)
		if (totalVotes >= totalParticipants) {
			const maxVotes = Math.max(match.blueVotes, match.redVotes, match.drawVotes)
			const winners: Array<'BLUE' | 'RED' | 'DRAW'> = []
			if (match.blueVotes === maxVotes) winners.push('BLUE')
			if (match.redVotes === maxVotes) winners.push('RED')
			if (match.drawVotes === maxVotes) winners.push('DRAW')

			// Single winner or tie = draw
			return winners.length === 1 && winners[0] ? winners[0] : 'DRAW'
		}

		return null
	}

	const winningTeam = determineWinningTeam()

	if (!winningTeam) {
		return c.json({ message: 'Not enough votes' }, 400)
	}

	const isDraw = winningTeam === 'DRAW'
	const participants = Object.entries(teamAssignments)

	const blueRatings = participants.filter(([, a]) => a.team === 'BLUE').map(([, a]) => a.rating)
	const redRatings = participants.filter(([, a]) => a.team === 'RED').map(([, a]) => a.rating)
	const blueAverage = calculateTeamAverageRating(blueRatings)
	const redAverage = calculateTeamAverageRating(redRatings)

	const participantDiscordIds = participants.map(([discordId]) => discordId)
	const currentRatings = await db
		.select()
		.from(guildUserStats)
		.where(and(eq(guildUserStats.guildId, match.guildId), inArray(guildUserStats.discordId, participantDiscordIds)))

	const ratingsMap = new Map(currentRatings.map((r) => [r.discordId, r]))

	const ratingChanges: Array<{
		discordId: string
		team: 'BLUE' | 'RED'
		role: 'TOP' | 'JUNGLE' | 'MIDDLE' | 'BOTTOM' | 'SUPPORT'
		ratingBefore: number
		ratingAfter: number
		change: number
	}> = []

	for (const [discordId, assignment] of participants) {
		const isBlue = assignment.team === 'BLUE'
		const won = (isBlue && winningTeam === 'BLUE') || (!isBlue && winningTeam === 'RED')
		const opponentAverage = isBlue ? redAverage : blueAverage

		const currentRating = ratingsMap.get(discordId)

		const placementGames = currentRating?.placementGames ?? 0
		const isPlacement = isInPlacement(placementGames)

		// Draw: no rating change
		const newRating = isDraw
			? assignment.rating
			: calculateNewRating(assignment.rating, opponentAverage, won, isPlacement)

		ratingChanges.push({
			discordId,
			team: assignment.team,
			role: assignment.role,
			ratingBefore: assignment.rating,
			ratingAfter: newRating,
			change: newRating - assignment.rating,
		})
	}

	const finalMatchId = crypto.randomUUID()

	// Build stats updates
	const statsUpdates = ratingChanges.map((rc) => {
		const won = !isDraw && rc.team === winningTeam
		const lost = !isDraw && rc.team !== winningTeam
		const existing = ratingsMap.get(rc.discordId)

		if (existing) {
			return db
				.update(guildUserStats)
				.set({
					rating: rc.ratingAfter,
					wins: won ? existing.wins + 1 : existing.wins,
					losses: lost ? existing.losses + 1 : existing.losses,
					placementGames: Math.min(existing.placementGames + 1, PLACEMENT_GAMES),
				})
				.where(and(eq(guildUserStats.guildId, match.guildId), eq(guildUserStats.discordId, rc.discordId)))
		}
		return db.insert(guildUserStats).values({
			guildId: match.guildId,
			discordId: rc.discordId,
			rating: rc.ratingAfter,
			wins: won ? 1 : 0,
			losses: lost ? 1 : 0,
			placementGames: 1,
		})
	})

	try {
		await db.batch([
			db.insert(guildMatches).values({
				id: finalMatchId,
				guildId: match.guildId,
				winningTeam,
			}),
			db.insert(guildMatchPlayers).values(
				ratingChanges.map((rc) => ({
					matchId: finalMatchId,
					discordId: rc.discordId,
					team: rc.team,
					role: rc.role,
					ratingBefore: rc.ratingBefore,
					ratingAfter: rc.ratingAfter,
				})),
			),
			...statsUpdates,
			db.update(guildPendingMatches).set({ status: 'confirmed' }).where(eq(guildPendingMatches.id, matchId)),
		])
	} catch (error) {
		console.error('Batch execution failed:', error)
		return c.json({ message: 'Failed to confirm match' }, 500)
	}

	return c.json(
		{
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
		},
		200,
	)
})

export default app
