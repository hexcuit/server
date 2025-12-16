import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { HTTPException } from 'hono/http-exception'
import { guildMatchVotes, guildPendingMatches } from '@/db/schema'
import { calculateMajority, GetMatchResponseSchema, MatchIdParamSchema, parseTeamAssignments } from '../schemas'

const getMatchRoute = createRoute({
	method: 'get',
	path: '/{matchId}',
	tags: ['Guild Matches'],
	summary: 'Get match',
	description: 'Get match details',
	request: {
		params: MatchIdParamSchema,
	},
	responses: {
		200: {
			description: 'Successfully retrieved match',
			content: { 'application/json': { schema: GetMatchResponseSchema } },
		},
		404: {
			description: 'Match not found',
		},
	},
})

export const getMatchRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(getMatchRoute, async (c) => {
	const { matchId } = c.req.valid('param')
	const db = drizzle(c.env.DB)

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
