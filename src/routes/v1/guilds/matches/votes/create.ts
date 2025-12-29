import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, count, eq, sql } from 'drizzle-orm'
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

	if (existingVote) {
		if (existingVote.vote !== vote) {
			// Calculate vote count adjustments using SQL increment/decrement
			const blueAdjust = (vote === 'BLUE' ? 1 : 0) - (existingVote.vote === 'BLUE' ? 1 : 0)
			const redAdjust = (vote === 'RED' ? 1 : 0) - (existingVote.vote === 'RED' ? 1 : 0)
			const drawAdjust = (vote === 'DRAW' ? 1 : 0) - (existingVote.vote === 'DRAW' ? 1 : 0)

			// Atomic batch update
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

			changed = true
		}
	} else {
		// Atomic batch: insert vote and increment count
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

		changed = true
	}

	// Get updated match and participant count
	const [updatedMatch, participantCount] = await Promise.all([
		db.select().from(guildMatches).where(eq(guildMatches.id, matchId)).get(),
		db.select({ total: count() }).from(guildMatchPlayers).where(eq(guildMatchPlayers.matchId, matchId)),
	])

	const totalParticipants = participantCount[0]?.total ?? 0
	const votesRequired = Math.ceil(totalParticipants / 2) + 1 // Majority

	return c.json(
		{
			changed,
			blueVotes: updatedMatch?.blueVotes ?? 0,
			redVotes: updatedMatch?.redVotes ?? 0,
			drawVotes: updatedMatch?.drawVotes ?? 0,
			totalParticipants,
			votesRequired,
		},
		200,
	)
})

export default app
