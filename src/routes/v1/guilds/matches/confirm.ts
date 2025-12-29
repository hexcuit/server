import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { z } from 'zod'
import type { MatchResult, PlayerResult } from '@/constants'
import { guildMatches, guildMatchPlayers, guilds, guildUserMatchHistory, guildUserStats } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
		matchId: z.string().openapi({ description: 'Match ID' }),
	})
	.openapi('ConfirmMatchParam')

const RatingChangeSchema = z.object({
	discordId: z.string(),
	ratingBefore: z.number(),
	ratingAfter: z.number(),
	ratingChange: z.number(),
})

const ResponseSchema = z
	.object({
		confirmed: z.boolean(),
		winningTeam: z.enum(['BLUE', 'RED', 'DRAW']).nullable(),
		ratingChanges: z.array(RatingChangeSchema),
	})
	.openapi('ConfirmMatchResponse')

const route = createRoute({
	method: 'post',
	path: '/v1/guilds/{guildId}/matches/{matchId}/confirm',
	tags: ['Matches'],
	summary: 'Confirm match',
	description: 'Confirm match result and calculate rating changes',
	request: {
		params: ParamSchema,
	},
	responses: {
		200: {
			description: 'Match confirmed',
			content: { 'application/json': { schema: ResponseSchema } },
		},
		404: {
			description: 'Guild or match not found',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
		400: {
			description: 'Match already confirmed or no majority vote',
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

	// Determine winner
	const { blueVotes, redVotes, drawVotes } = match
	let winningTeam: MatchResult | null = null

	if (blueVotes > redVotes && blueVotes > drawVotes) {
		winningTeam = 'BLUE'
	} else if (redVotes > blueVotes && redVotes > drawVotes) {
		winningTeam = 'RED'
	} else if (drawVotes > blueVotes && drawVotes > redVotes) {
		winningTeam = 'DRAW'
	} else {
		return c.json({ message: 'No majority vote' }, 400)
	}

	// Get players
	const players = await db.select().from(guildMatchPlayers).where(eq(guildMatchPlayers.matchId, matchId))

	// Calculate rating changes (simple ELO-like system)
	const K_FACTOR = 32
	const ratingChanges: { discordId: string; ratingBefore: number; ratingAfter: number; ratingChange: number }[] = []

	for (const player of players) {
		let result: PlayerResult
		let ratingChange: number

		if (winningTeam === 'DRAW') {
			result = 'DRAW'
			ratingChange = 0
		} else if (player.team === winningTeam) {
			result = 'WIN'
			ratingChange = Math.round(K_FACTOR / 2)
		} else {
			result = 'LOSE'
			ratingChange = -Math.round(K_FACTOR / 2)
		}

		const ratingAfter = player.ratingBefore + ratingChange

		// Update user stats
		const currentStats = await db
			.select()
			.from(guildUserStats)
			.where(and(eq(guildUserStats.guildId, guildId), eq(guildUserStats.discordId, player.discordId)))
			.get()

		if (currentStats) {
			const newWins = result === 'WIN' ? currentStats.wins + 1 : currentStats.wins
			const newLosses = result === 'LOSE' ? currentStats.losses + 1 : currentStats.losses
			const newStreak =
				result === 'WIN'
					? currentStats.currentStreak > 0
						? currentStats.currentStreak + 1
						: 1
					: result === 'LOSE'
						? currentStats.currentStreak < 0
							? currentStats.currentStreak - 1
							: -1
						: 0
			const newPeakRating = Math.max(currentStats.peakRating, ratingAfter)

			await db
				.update(guildUserStats)
				.set({
					rating: ratingAfter,
					wins: newWins,
					losses: newLosses,
					currentStreak: newStreak,
					peakRating: newPeakRating,
					lastPlayedAt: new Date(),
				})
				.where(and(eq(guildUserStats.guildId, guildId), eq(guildUserStats.discordId, player.discordId)))
		}

		// Add to history
		await db.insert(guildUserMatchHistory).values({
			guildId,
			discordId: player.discordId,
			matchId,
			result,
			ratingChange,
			ratingAfter,
		})

		ratingChanges.push({
			discordId: player.discordId,
			ratingBefore: player.ratingBefore,
			ratingAfter,
			ratingChange,
		})
	}

	// Update match
	await db
		.update(guildMatches)
		.set({
			status: 'confirmed',
			winningTeam,
			confirmedAt: new Date(),
		})
		.where(eq(guildMatches.id, matchId))

	return c.json(
		{
			confirmed: true,
			winningTeam,
			ratingChanges,
		},
		200,
	)
})

export default app
