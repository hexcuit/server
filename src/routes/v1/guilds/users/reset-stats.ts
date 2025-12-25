import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq, inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { guildMatches, guildMatchPlayers, guildUserStats } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'
import { ResetUserStatsResponseSchema, UserHistoryParamSchema } from '../schemas'

const route = createRoute({
	method: 'delete',
	path: '/v1/guilds/{guildId}/users/{discordId}/stats',
	tags: ['Guild Users'],
	summary: 'Reset user stats',
	description: 'Reset stats and match history for a specific user in a guild. This action is irreversible.',
	request: {
		params: UserHistoryParamSchema,
	},
	responses: {
		200: {
			description: 'User stats reset successfully',
			content: {
				'application/json': {
					schema: ResetUserStatsResponseSchema,
				},
			},
		},
		401: {
			description: 'Unauthorized',
			content: {
				'application/json': {
					schema: ErrorResponseSchema,
				},
			},
		},
		404: {
			description: 'User stats not found',
			content: {
				'application/json': {
					schema: ErrorResponseSchema,
				},
			},
		},
		500: {
			description: 'Internal server error',
			content: {
				'application/json': {
					schema: ErrorResponseSchema,
				},
			},
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId, discordId } = c.req.valid('param')
	const db = drizzle(c.env.DB)

	// 1. Check if user stats exist
	const existingStats = await db
		.select()
		.from(guildUserStats)
		.where(and(eq(guildUserStats.guildId, guildId), eq(guildUserStats.discordId, discordId)))
		.limit(1)

	if (existingStats.length === 0) {
		return c.json({ message: 'User stats not found' }, 404)
	}

	// 2. Get all match IDs for this guild
	const matches = await db.select({ id: guildMatches.id }).from(guildMatches).where(eq(guildMatches.guildId, guildId))

	const matchIds = matches.map((m) => m.id)

	// 3. Delete match players and user stats in a single transaction
	try {
		const deleteUserStats = db
			.delete(guildUserStats)
			.where(and(eq(guildUserStats.guildId, guildId), eq(guildUserStats.discordId, discordId)))

		if (matchIds.length > 0) {
			const deleteMatchPlayers = db
				.delete(guildMatchPlayers)
				.where(and(eq(guildMatchPlayers.discordId, discordId), inArray(guildMatchPlayers.matchId, matchIds)))

			const [matchPlayersResult, userStatsResult] = await db.batch([deleteMatchPlayers, deleteUserStats])

			return c.json(
				{
					deleted: true,
					deletedCounts: {
						userStats: userStatsResult.meta.changes,
						matchPlayers: matchPlayersResult.meta.changes,
					},
				},
				200,
			)
		}

		const [userStatsResult] = await db.batch([deleteUserStats])

		return c.json(
			{
				deleted: true,
				deletedCounts: {
					userStats: userStatsResult.meta.changes,
					matchPlayers: 0,
				},
			},
			200,
		)
	} catch (error) {
		console.error('Failed to reset user stats:', error)
		return c.json({ message: 'Failed to reset user stats' }, 500)
	}
})

export default app
