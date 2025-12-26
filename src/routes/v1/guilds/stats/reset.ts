import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { eq, inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { guildMatches, guildMatchVotes, guildPendingMatches, guildUserMatchHistory, guildUserStats } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'
import { GuildParamSchema, ResetGuildStatsResponseSchema } from '../schemas'

const route = createRoute({
	method: 'delete',
	path: '/v1/guilds/{guildId}/stats',
	tags: ['Guild Stats'],
	summary: 'Reset guild stats',
	description: 'Reset all stats, matches, and match history for a guild. This action is irreversible.',
	request: {
		params: GuildParamSchema,
	},
	responses: {
		200: {
			description: 'Guild stats reset successfully',
			content: {
				'application/json': {
					schema: ResetGuildStatsResponseSchema,
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
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId } = c.req.valid('param')
	const db = drizzle(c.env.DB)

	// 1. Get all pending match IDs for this guild
	const pendingMatches = await db
		.select({ id: guildPendingMatches.id })
		.from(guildPendingMatches)
		.where(eq(guildPendingMatches.guildId, guildId))

	const pendingMatchIds = pendingMatches.map((m) => m.id)

	// 2. Delete match history
	const matchHistoryResult = await db
		.delete(guildUserMatchHistory)
		.where(eq(guildUserMatchHistory.guildId, guildId))
		.run()

	// 3. Delete match votes (for pending matches)
	if (pendingMatchIds.length > 0) {
		await db.delete(guildMatchVotes).where(inArray(guildMatchVotes.pendingMatchId, pendingMatchIds)).run()
	}

	// 4. Delete confirmed matches
	const matchesResult = await db.delete(guildMatches).where(eq(guildMatches.guildId, guildId)).run()

	// 5. Delete pending matches
	const pendingMatchesResult = await db
		.delete(guildPendingMatches)
		.where(eq(guildPendingMatches.guildId, guildId))
		.run()

	// 6. Delete user stats
	const userStatsResult = await db.delete(guildUserStats).where(eq(guildUserStats.guildId, guildId)).run()

	return c.json(
		{
			deleted: true,
			deletedCounts: {
				userStats: userStatsResult.meta.changes,
				matches: matchesResult.meta.changes,
				matchHistory: matchHistoryResult.meta.changes,
				pendingMatches: pendingMatchesResult.meta.changes,
			},
		},
		200,
	)
})

export default app
