import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { hc } from 'hono/client'
import { guildRatings, users } from '@/db/schema'
import { formatRankDisplay, getRankDisplay, INITIAL_RATING, isInPlacement } from '@/utils/elo'
import { GuildIdParamSchema, UpsertRatingBodySchema, UpsertRatingResponseSchema } from '../schemas'

const route = createRoute({
	method: 'put',
	path: '/v1/guilds/{guildId}/ratings',
	tags: ['Guild Ratings'],
	summary: 'Initialize guild rating',
	description: 'Initialize guild rating for first-time participation',
	request: {
		params: GuildIdParamSchema,
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

	const existing = await db
		.select()
		.from(guildRatings)
		.where(and(eq(guildRatings.guildId, guildId), eq(guildRatings.discordId, discordId)))
		.get()

	if (existing) {
		const rankDisplay = getRankDisplay(existing.rating)
		return c.json(
			{
				created: false,
				rating: {
					discordId,
					guildId,
					rating: existing.rating,
					wins: existing.wins,
					losses: existing.losses,
					placementGames: existing.placementGames,
					isPlacement: isInPlacement(existing.placementGames),
					rank: formatRankDisplay(rankDisplay),
					rankDetail: rankDisplay,
				},
			},
			200,
		)
	}

	await db.insert(guildRatings).values({
		guildId,
		discordId,
		rating: INITIAL_RATING,
		wins: 0,
		losses: 0,
		placementGames: 0,
	})

	const rankDisplay = getRankDisplay(INITIAL_RATING)
	return c.json(
		{
			created: true,
			rating: {
				discordId,
				guildId,
				rating: INITIAL_RATING,
				wins: 0,
				losses: 0,
				placementGames: 0,
				isPlacement: true,
				rank: formatRankDisplay(rankDisplay),
				rankDetail: rankDisplay,
			},
		},
		201,
	)
})

export default app

export const hcWithType = (...args: Parameters<typeof hc>) => hc<typeof typedApp>(...args)
