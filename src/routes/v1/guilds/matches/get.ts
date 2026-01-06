import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import { LOL_TEAMS, MATCH_STATUSES } from '@/constants'
import { guildMatches, guildMatchPlayers, guilds } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
		matchId: z.string().openapi({ description: 'Match ID' }),
	})
	.openapi('GetMatchParam')

const TeamAssignmentSchema = createSelectSchema(guildMatchPlayers)
	.pick({
		team: true,
		role: true,
		ratingBefore: true,
	})
	.transform((p) => ({
		team: p.team,
		role: p.role,
		rating: p.ratingBefore,
	}))

const VotesSchema = z.object({
	blueVotes: z.number(),
	redVotes: z.number(),
	drawVotes: z.number(),
	totalParticipants: z.number(),
	votesRequired: z.number(),
})

const ResponseSchema = createSelectSchema(guildMatches)
	.pick({
		id: true,
		status: true,
	})
	.extend({
		teamAssignments: z.record(
			z.string(),
			z.object({
				team: z.enum(LOL_TEAMS),
				role: z.string(),
				rating: z.number(),
			}),
		),
		votes: VotesSchema,
	})
	.openapi('GetMatchResponse')

const route = createRoute({
	method: 'get',
	path: '/v1/guilds/{guildId}/matches/{matchId}',
	tags: ['Matches'],
	summary: 'Get match',
	description: '試合を取得する',
	request: {
		params: ParamSchema,
	},
	responses: {
		200: {
			description: 'Match found',
			content: { 'application/json': { schema: ResponseSchema } },
		},
		404: {
			description: 'Guild or match not found',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId, matchId } = c.req.valid('param')
	const db = drizzle(c.env.DB)

	// Check if guild exists
	const guild = await db.select().from(guilds).where(eq(guilds.guildId, guildId)).get()

	if (!guild) {
		return c.json({ message: 'Guild not found' }, 404)
	}

	// Get match
	const match = await db
		.select({
			id: guildMatches.id,
			status: guildMatches.status,
			blueVotes: guildMatches.blueVotes,
			redVotes: guildMatches.redVotes,
			drawVotes: guildMatches.drawVotes,
		})
		.from(guildMatches)
		.where(and(eq(guildMatches.id, matchId), eq(guildMatches.guildId, guildId)))
		.get()

	if (!match) {
		return c.json({ message: 'Match not found' }, 404)
	}

	// Get players
	const players = await db
		.select({
			discordId: guildMatchPlayers.discordId,
			team: guildMatchPlayers.team,
			role: guildMatchPlayers.role,
			ratingBefore: guildMatchPlayers.ratingBefore,
		})
		.from(guildMatchPlayers)
		.where(eq(guildMatchPlayers.matchId, matchId))

	// Build teamAssignments - Drizzle infers correct enum types from schema
	const teamAssignments = Object.fromEntries(
		players.map((p) => [p.discordId, { team: p.team, role: p.role, rating: p.ratingBefore }]),
	)

	const totalParticipants = players.length
	const votesRequired = Math.floor(totalParticipants / 2) + 1

	return c.json(
		{
			id: match.id,
			status: match.status,
			teamAssignments,
			votes: {
				blueVotes: match.blueVotes,
				redVotes: match.redVotes,
				drawVotes: match.drawVotes,
				totalParticipants,
				votesRequired,
			},
		},
		200,
	)
})

export default app
