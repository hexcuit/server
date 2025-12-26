import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { createSelectSchema } from 'drizzle-zod'
import { INITIAL_RATING } from '@/constants/rating'
import { guildSettings, guilds, guildUserStats, users } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
		discordId: z.string().openapi({ description: 'Discord User ID' }),
	})
	.openapi('CreateGuildUserStatsParam')

const ResponseSchema = createSelectSchema(guildUserStats)
	.pick({
		discordId: true,
		rating: true,
		wins: true,
		losses: true,
		placementGames: true,
		peakRating: true,
		currentStreak: true,
	})
	.openapi('CreateGuildUserStatsResponse')

const route = createRoute({
	method: 'post',
	path: '/v1/guilds/{guildId}/users/{discordId}/stats',
	tags: ['GuildUserStats'],
	summary: 'Initialize user stats in guild',
	description: 'Initialize user stats in guild',
	request: {
		params: ParamSchema,
	},
	responses: {
		201: {
			description: 'User stats created',
			content: { 'application/json': { schema: ResponseSchema } },
		},
		404: {
			description: 'Guild or user not found',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
		409: {
			description: 'Stats already exist',
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

	// Check if user exists
	const user = await db.select().from(users).where(eq(users.discordId, discordId)).get()

	if (!user) {
		return c.json({ message: 'User not found' }, 404)
	}

	// Get initial rating from guild settings or default
	const settings = await db
		.select({ initialRating: guildSettings.initialRating })
		.from(guildSettings)
		.where(eq(guildSettings.guildId, guildId))
		.get()

	const initialRating = settings?.initialRating ?? INITIAL_RATING

	// Create stats
	const [stats] = await db
		.insert(guildUserStats)
		.values({
			guildId,
			discordId,
			rating: initialRating,
			peakRating: initialRating,
		})
		.onConflictDoNothing()
		.returning({
			discordId: guildUserStats.discordId,
			rating: guildUserStats.rating,
			wins: guildUserStats.wins,
			losses: guildUserStats.losses,
			placementGames: guildUserStats.placementGames,
			peakRating: guildUserStats.peakRating,
			currentStreak: guildUserStats.currentStreak,
		})

	if (!stats) {
		return c.json({ message: 'Stats already exist' }, 409)
	}

	return c.json(stats, 201)
})

export default app
