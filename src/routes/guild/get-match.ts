import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { HTTPException } from 'hono/http-exception'
import { guildMatchVotes, guildPendingMatches } from '@/db/schema'
import { calculateMajority, GetMatchResponseSchema, parseTeamAssignments } from './schemas'

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

export const getMatchRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(getMatchRoute, async (c) => {
	const matchId = c.req.valid('param').id
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
