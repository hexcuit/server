import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import { guildMatches, guildMatchPlayers, guildMatchVotes, guilds } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
		matchId: z.string().openapi({ description: 'Match ID' }),
	})
	.openapi('GetMatchParam')

const PlayerSchema = createSelectSchema(guildMatchPlayers).pick({
	discordId: true,
	team: true,
	role: true,
	ratingBefore: true,
})

const VoteSchema = createSelectSchema(guildMatchVotes).pick({
	discordId: true,
	vote: true,
})

const ResponseSchema = createSelectSchema(guildMatches)
	.pick({
		id: true,
		channelId: true,
		messageId: true,
		status: true,
		winningTeam: true,
		blueVotes: true,
		redVotes: true,
		drawVotes: true,
		createdAt: true,
		confirmedAt: true,
	})
	.extend({
		players: z.array(PlayerSchema),
		votes: z.array(VoteSchema),
	})
	.openapi('GetMatchResponse')

const route = createRoute({
	method: 'get',
	path: '/v1/guilds/{guildId}/matches/{matchId}',
	tags: ['Matches'],
	summary: 'Get match',
	description: 'Get match by ID',
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
			channelId: guildMatches.channelId,
			messageId: guildMatches.messageId,
			status: guildMatches.status,
			winningTeam: guildMatches.winningTeam,
			blueVotes: guildMatches.blueVotes,
			redVotes: guildMatches.redVotes,
			drawVotes: guildMatches.drawVotes,
			createdAt: guildMatches.createdAt,
			confirmedAt: guildMatches.confirmedAt,
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

	// Get votes
	const votes = await db
		.select({
			discordId: guildMatchVotes.discordId,
			vote: guildMatchVotes.vote,
		})
		.from(guildMatchVotes)
		.where(eq(guildMatchVotes.matchId, matchId))

	return c.json({ ...match, players, votes }, 200)
})

export default app
