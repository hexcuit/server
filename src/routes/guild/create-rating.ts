import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { guildRatings, users } from '@/db/schema'
import { formatRankDisplay, getRankDisplay, INITIAL_RATING, isInPlacement } from '@/utils/elo'
import { CreateRatingResponseSchema, CreateRatingSchema } from './schemas'

const createRatingRoute = createRoute({
	method: 'post',
	path: '/rating',
	tags: ['Guild Rating'],
	summary: 'ギルドレート初期化',
	description: '初回参加時にギルドレートを初期化します',
	request: {
		body: { content: { 'application/json': { schema: CreateRatingSchema } } },
	},
	responses: {
		200: {
			description: 'レート初期化成功',
			content: { 'application/json': { schema: CreateRatingResponseSchema } },
		},
	},
})

export const createRatingRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(
	createRatingRoute,
	async (c) => {
		const { guildId, discordId } = c.req.valid('json')
		const db = drizzle(c.env.DB)

		await db.insert(users).values({ discordId }).onConflictDoNothing()

		const existing = await db
			.select()
			.from(guildRatings)
			.where(and(eq(guildRatings.guildId, guildId), eq(guildRatings.discordId, discordId)))
			.get()

		if (existing) {
			const rankDisplay = getRankDisplay(existing.rating)
			return c.json({
				success: true,
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
			})
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
		return c.json({
			success: true,
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
		})
	},
)
