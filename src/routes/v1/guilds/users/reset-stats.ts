import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { guildUserMatchHistory, guildUserStats } from '@/db/schema'
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

	// 2. Delete match history and user stats
	try {
		const deleteMatchHistory = db
			.delete(guildUserMatchHistory)
			.where(and(eq(guildUserMatchHistory.guildId, guildId), eq(guildUserMatchHistory.discordId, discordId)))

		const deleteUserStats = db
			.delete(guildUserStats)
			.where(and(eq(guildUserStats.guildId, guildId), eq(guildUserStats.discordId, discordId)))

		const [matchHistoryResult, userStatsResult] = await db.batch([deleteMatchHistory, deleteUserStats])

		return c.json(
			{
				deleted: true,
				deletedCounts: {
					userStats: userStatsResult.meta.changes,
					matchHistory: matchHistoryResult.meta.changes,
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
