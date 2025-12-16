import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { HTTPException } from 'hono/http-exception'
import { guildMatchVotes, guildPendingMatches } from '@/db/schema'
import {
	calculateMajority,
	MatchIdParamSchema,
	parseTeamAssignments,
	VoteBodySchema,
	VoteResponseSchema,
} from '../schemas'

const voteMatchRoute = createRoute({
	method: 'post',
	path: '/{matchId}/votes',
	tags: ['Guild Matches'],
	summary: 'Vote on match',
	description: 'Vote on the match outcome',
	request: {
		params: MatchIdParamSchema,
		body: { content: { 'application/json': { schema: VoteBodySchema } } },
	},
	responses: {
		200: {
			description: 'Vote registered',
			content: { 'application/json': { schema: VoteResponseSchema } },
		},
		400: {
			description: 'Match is not in voting state',
		},
		403: {
			description: 'Not a participant',
		},
		404: {
			description: 'Match not found',
		},
	},
})

export const voteMatchRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(voteMatchRoute, async (c) => {
	const { matchId } = c.req.valid('param')
	const { discordId, vote } = c.req.valid('json')
	const db = drizzle(c.env.DB)

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
		changed: true,
		blueVotes: newBlueVotes,
		redVotes: newRedVotes,
		totalParticipants,
		votesRequired,
	})
})
