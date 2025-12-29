import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { createInsertSchema } from 'drizzle-zod'
import { z } from 'zod'
import { guildMatches, guildMatchPlayers, guildMatchVotes, guilds } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
		matchId: z.string().openapi({ description: 'Match ID' }),
	})
	.openapi('CreateVoteParam')

const BodySchema = createInsertSchema(guildMatchVotes).pick({ discordId: true, vote: true }).openapi('CreateVoteBody')

const ResponseSchema = z
	.object({
		changed: z.boolean(),
		blueVotes: z.number(),
		redVotes: z.number(),
		drawVotes: z.number(),
		totalParticipants: z.number(),
		votesRequired: z.number(),
	})
	.openapi('CreateVoteResponse')

const route = createRoute({
	method: 'post',
	path: '/v1/guilds/{guildId}/matches/{matchId}/votes',
	tags: ['Votes'],
	summary: 'Vote on match',
	description: 'Cast or change vote on a match',
	request: {
		params: ParamSchema,
		body: { content: { 'application/json': { schema: BodySchema } } },
	},
	responses: {
		200: {
			description: 'Vote recorded',
			content: { 'application/json': { schema: ResponseSchema } },
		},
		404: {
			description: 'Guild, match, or player not found',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
		400: {
			description: 'Match already confirmed',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId, matchId } = c.req.valid('param')
	const { discordId, vote } = c.req.valid('json')
	const db = drizzle(c.env.DB)

	// Check if guild exists
	const guild = await db.select().from(guilds).where(eq(guilds.guildId, guildId)).get()

	if (!guild) {
		return c.json({ message: 'Guild not found' }, 404)
	}

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

	let changed = false
	let blueVotes = match.blueVotes
	let redVotes = match.redVotes
	let drawVotes = match.drawVotes

	if (existingVote) {
		if (existingVote.vote !== vote) {
			// Remove old vote count
			if (existingVote.vote === 'BLUE') blueVotes--
			else if (existingVote.vote === 'RED') redVotes--
			else drawVotes--

			// Add new vote count
			if (vote === 'BLUE') blueVotes++
			else if (vote === 'RED') redVotes++
			else drawVotes++

			// Update vote
			await db
				.update(guildMatchVotes)
				.set({ vote })
				.where(and(eq(guildMatchVotes.matchId, matchId), eq(guildMatchVotes.discordId, discordId)))

			// Update match vote counts
			await db.update(guildMatches).set({ blueVotes, redVotes, drawVotes }).where(eq(guildMatches.id, matchId))

			changed = true
		}
	} else {
		// Insert new vote
		await db.insert(guildMatchVotes).values({ matchId, discordId, vote })

		// Update vote count
		if (vote === 'BLUE') blueVotes++
		else if (vote === 'RED') redVotes++
		else drawVotes++

		await db.update(guildMatches).set({ blueVotes, redVotes, drawVotes }).where(eq(guildMatches.id, matchId))

		changed = true
	}

	// Get total participants
	const players = await db.select().from(guildMatchPlayers).where(eq(guildMatchPlayers.matchId, matchId))

	const totalParticipants = players.length
	const votesRequired = Math.ceil(totalParticipants / 2) + 1 // Majority

	return c.json(
		{
			changed,
			blueVotes,
			redVotes,
			drawVotes,
			totalParticipants,
			votesRequired,
		},
		200,
	)
})

export default app
