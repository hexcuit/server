import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { createSelectSchema } from 'drizzle-zod'

import { guilds, guildUserStats } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = createSelectSchema(guildUserStats)
	.pick({ guildId: true, discordId: true })
	.openapi('GetGuildUserStatsParam')

const ResponseSchema = createSelectSchema(guildUserStats)
	.pick({
		discordId: true,
		rating: true,
		wins: true,
		losses: true,
		placementGames: true,
		peakRating: true,
		currentStreak: true,
		lastPlayedAt: true,
	})
	.openapi('GetGuildUserStatsResponse')

const route = createRoute({
	method: 'get',
	path: '/v1/guilds/{guildId}/users/{discordId}/stats',
	tags: ['Stats'],
	summary: 'Get user stats in guild',
	description: 'Get user stats in guild',
	request: {
		params: ParamSchema,
	},
	responses: {
		200: {
			description: 'User stats',
			content: { 'application/json': { schema: ResponseSchema } },
		},
		404: {
			description: 'Guild or stats not found',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId, discordId } = c.req.valid('param')
	const db = drizzle(c.env.DB)

	// Check if guild exists
	const guild = await db.select().from(guilds).where(eq(guilds.guildId, guildId)).get()

	if (!guild) {
		return c.json({ message: 'Guild not found' }, 404)
	}

	// Get stats
	const stats = await db
		.select({
			discordId: guildUserStats.discordId,
			rating: guildUserStats.rating,
			wins: guildUserStats.wins,
			losses: guildUserStats.losses,
			placementGames: guildUserStats.placementGames,
			peakRating: guildUserStats.peakRating,
			currentStreak: guildUserStats.currentStreak,
			lastPlayedAt: guildUserStats.lastPlayedAt,
		})
		.from(guildUserStats)
		.where(and(eq(guildUserStats.guildId, guildId), eq(guildUserStats.discordId, discordId)))
		.get()

	if (!stats) {
		return c.json({ message: 'Stats not found' }, 404)
	}

	return c.json(stats, 200)
})

export default app
