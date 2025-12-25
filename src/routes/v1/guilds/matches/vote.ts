import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { guildMatchVotes, guildPendingMatches } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'
import {
	calculateMajority,
	MatchIdParamSchema,
	parseTeamAssignments,
	VoteBodySchema,
	VoteResponseSchema,
} from '../schemas'

const route = createRoute({
	method: 'post',
	path: '/v1/guilds/{guildId}/matches/{matchId}/votes',
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
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
		403: {
			description: 'Not a participant',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
		404: {
			description: 'Match not found',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId, matchId } = c.req.valid('param')
	const { discordId, vote } = c.req.valid('json')
	const db = drizzle(c.env.DB)

	const match = await db.select().from(guildPendingMatches).where(eq(guildPendingMatches.id, matchId)).get()

	if (!match || match.guildId !== guildId) {
		return c.json({ message: 'Match not found' }, 404)
	}

	if (match.status !== 'voting') {
		return c.json({ message: 'Match is not in voting state' }, 400)
	}

	const teamAssignments = parseTeamAssignments(match.teamAssignments)
	if (!teamAssignments[discordId]) {
		return c.json({ message: 'Not a participant' }, 403)
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
			return c.json(
				{
					changed: false,
					blueVotes: match.blueVotes,
					redVotes: match.redVotes,
					drawVotes: match.drawVotes,
					totalParticipants,
					votesRequired,
				},
				200,
			)
		}

		await db
			.update(guildMatchVotes)
			.set({ vote })
			.where(and(eq(guildMatchVotes.pendingMatchId, matchId), eq(guildMatchVotes.discordId, discordId)))

		// Use SQL increment for atomic vote count updates
		const prevVote = existingVote.vote
		const blueIncrement = (vote === 'BLUE' ? 1 : 0) - (prevVote === 'BLUE' ? 1 : 0)
		const redIncrement = (vote === 'RED' ? 1 : 0) - (prevVote === 'RED' ? 1 : 0)
		const drawIncrement = (vote === 'DRAW' ? 1 : 0) - (prevVote === 'DRAW' ? 1 : 0)

		const [updatedMatch] = await db
			.update(guildPendingMatches)
			.set({
				blueVotes: sql`${guildPendingMatches.blueVotes} + ${blueIncrement}`,
				redVotes: sql`${guildPendingMatches.redVotes} + ${redIncrement}`,
				drawVotes: sql`${guildPendingMatches.drawVotes} + ${drawIncrement}`,
			})
			.where(eq(guildPendingMatches.id, matchId))
			.returning({
				blueVotes: guildPendingMatches.blueVotes,
				redVotes: guildPendingMatches.redVotes,
				drawVotes: guildPendingMatches.drawVotes,
			})

		if (!updatedMatch) {
			return c.json({ message: 'Match not found' }, 404)
		}

		return c.json(
			{
				changed: true,
				blueVotes: updatedMatch.blueVotes,
				redVotes: updatedMatch.redVotes,
				drawVotes: updatedMatch.drawVotes,
				totalParticipants,
				votesRequired,
			},
			200,
		)
	}

	await db.insert(guildMatchVotes).values({
		pendingMatchId: matchId,
		discordId,
		vote,
	})

	// Use SQL increment for atomic vote count updates
	const blueIncrement = vote === 'BLUE' ? 1 : 0
	const redIncrement = vote === 'RED' ? 1 : 0
	const drawIncrement = vote === 'DRAW' ? 1 : 0

	const [updatedMatch] = await db
		.update(guildPendingMatches)
		.set({
			blueVotes: sql`${guildPendingMatches.blueVotes} + ${blueIncrement}`,
			redVotes: sql`${guildPendingMatches.redVotes} + ${redIncrement}`,
			drawVotes: sql`${guildPendingMatches.drawVotes} + ${drawIncrement}`,
		})
		.where(eq(guildPendingMatches.id, matchId))
		.returning({
			blueVotes: guildPendingMatches.blueVotes,
			redVotes: guildPendingMatches.redVotes,
			drawVotes: guildPendingMatches.drawVotes,
		})

	if (!updatedMatch) {
		return c.json({ message: 'Match not found' }, 404)
	}

	return c.json(
		{
			changed: true,
			blueVotes: updatedMatch.blueVotes,
			redVotes: updatedMatch.redVotes,
			drawVotes: updatedMatch.drawVotes,
			totalParticipants,
			votesRequired,
		},
		200,
	)
})

export default app
