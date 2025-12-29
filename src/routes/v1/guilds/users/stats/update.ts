import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { guildUserStats } from '@/db/schema'
import { ensureGuild } from '@/utils/ensure'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
		discordId: z.string().openapi({ description: 'Discord User ID' }),
	})
	.openapi('UpdateGuildUserStatsParam')

const BodySchema = createInsertSchema(guildUserStats)
	.pick({ rating: true, wins: true, losses: true, placementGames: true, peakRating: true, currentStreak: true })
	.partial()
	.openapi('UpdateGuildUserStatsBody')

const ResponseSchema = createSelectSchema(guildUserStats)
	.pick({
		discordId: true,
		rating: true,
		wins: true,
		losses: true,
		placementGames: true,
		peakRating: true,
		currentStreak: true,
		updatedAt: true,
	})
	.openapi('UpdateGuildUserStatsResponse')

const route = createRoute({
	method: 'patch',
	path: '/v1/guilds/{guildId}/users/{discordId}/stats',
	tags: ['GuildUserStats'],
	summary: 'Update user stats in guild (admin)',
	description: 'Update user stats in guild (admin)',
	request: {
		params: ParamSchema,
		body: { content: { 'application/json': { schema: BodySchema } } },
	},
	responses: {
		200: {
			description: 'User stats updated',
			content: { 'application/json': { schema: ResponseSchema } },
		},
		404: {
			description: 'Stats not found',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId, discordId } = c.req.valid('param')
	const body = c.req.valid('json')
	const db = drizzle(c.env.DB)

	// Ensure guild exists
	await ensureGuild(db, guildId)

	// Update stats
	const [stats] = await db
		.update(guildUserStats)
		.set(body)
		.where(and(eq(guildUserStats.guildId, guildId), eq(guildUserStats.discordId, discordId)))
		.returning({
			discordId: guildUserStats.discordId,
			rating: guildUserStats.rating,
			wins: guildUserStats.wins,
			losses: guildUserStats.losses,
			placementGames: guildUserStats.placementGames,
			peakRating: guildUserStats.peakRating,
			currentStreak: guildUserStats.currentStreak,
			updatedAt: guildUserStats.updatedAt,
		})

	if (!stats) {
		return c.json({ message: 'Stats not found' }, 404)
	}

	return c.json(stats, 200)
})

export default app
