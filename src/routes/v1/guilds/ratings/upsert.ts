import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { guilds, guildUserStats, users } from '@/db/schema'
import { formatRankDisplay, getRankDisplay, INITIAL_RATING, isInPlacement } from '@/utils/elo'
import { GuildParamSchema, UpsertRatingBodySchema, UpsertRatingResponseSchema } from '../schemas'

const route = createRoute({
	method: 'put',
	path: '/v1/guilds/{guildId}/ratings',
	tags: ['Guild Ratings'],
	summary: 'Initialize guild rating',
	description: 'Initialize guild rating for first-time participation',
	request: {
		params: GuildParamSchema,
		body: { content: { 'application/json': { schema: UpsertRatingBodySchema } } },
	},
	responses: {
		200: {
			description: 'Rating already exists',
			content: { 'application/json': { schema: UpsertRatingResponseSchema } },
		},
		201: {
			description: 'Rating created',
			content: { 'application/json': { schema: UpsertRatingResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId } = c.req.valid('param')
	const { discordId } = c.req.valid('json')
	const db = drizzle(c.env.DB)

	await db.insert(users).values({ discordId }).onConflictDoNothing()
	await db.insert(guilds).values({ guildId }).onConflictDoNothing()

	const insertResult = await db
		.insert(guildUserStats)
		.values({
			guildId,
			discordId,
			rating: INITIAL_RATING,
			wins: 0,
			losses: 0,
			placementGames: 0,
		})
		.onConflictDoNothing()

	const created = (insertResult.meta?.changes ?? 0) > 0

	const rating = await db
		.select()
		.from(guildUserStats)
		.where(and(eq(guildUserStats.guildId, guildId), eq(guildUserStats.discordId, discordId)))
		.get()

	if (!rating) {
		throw new Error('Rating should exist after insert')
	}

	const rankDisplay = getRankDisplay(rating.rating)
	return c.json(
		{
			created,
			rating: {
				discordId,
				guildId,
				rating: rating.rating,
				wins: rating.wins,
				losses: rating.losses,
				placementGames: rating.placementGames,
				isPlacement: isInPlacement(rating.placementGames),
				rank: formatRankDisplay(rankDisplay),
				rankDetail: rankDisplay,
			},
		},
		created ? 201 : 200,
	)
})

export default app
