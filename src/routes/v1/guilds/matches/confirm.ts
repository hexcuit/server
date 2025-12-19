import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq, inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { hc } from 'hono/client'
import { guildPendingMatches, guildRatings } from '@/db/schema'
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

	const winningTeam: 'BLUE' | 'RED' | null =
		match.blueVotes >= votesRequired ? 'BLUE' : match.redVotes >= votesRequired ? 'RED' : null

	if (!winningTeam) {
		return c.json({ message: 'Not enough votes' }, 400)
	}
	const participants = Object.entries(teamAssignments)

	const blueRatings = participants.filter(([, a]) => a.team === 'BLUE').map(([, a]) => a.rating)
	const redRatings = participants.filter(([, a]) => a.team === 'RED').map(([, a]) => a.rating)
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
		team: 'BLUE' | 'RED'
		role: string
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

export const hcWithType = (...args: Parameters<typeof hc>) => hc<typeof typedApp>(...args)
