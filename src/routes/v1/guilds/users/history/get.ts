import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, count, desc, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import { guilds, guildUserMatchHistory, guildUserStats } from '@/db/schema'
import { ErrorResponseSchema, PaginationQuerySchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
		discordId: z.string().openapi({ description: 'Discord ID' }),
	})
	.openapi('GetUserHistoryParam')

const HistoryItemSchema = createSelectSchema(guildUserMatchHistory).pick({
	matchId: true,
	result: true,
	ratingChange: true,
	ratingAfter: true,
	createdAt: true,
})

const ResponseSchema = z
	.object({
		history: z.array(HistoryItemSchema),
		total: z.number(),
	})
	.openapi('GetUserHistoryResponse')

const route = createRoute({
	method: 'get',
	path: '/v1/guilds/{guildId}/users/{discordId}/history',
	tags: ['UserHistory'],
	summary: 'Get user match history',
	description: 'Get match history for a user in a guild',
	request: {
		params: ParamSchema,
		query: PaginationQuerySchema,
	},
	responses: {
		200: {
			description: 'History found',
			content: { 'application/json': { schema: ResponseSchema } },
		},
		404: {
			description: 'Guild or user stats not found',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId, discordId } = c.req.valid('param')
	const { limit, offset } = c.req.valid('query')
	const db = drizzle(c.env.DB)

	// Check if guild exists
	const guild = await db.select().from(guilds).where(eq(guilds.guildId, guildId)).get()

	if (!guild) {
		return c.json({ message: 'Guild not found' }, 404)
	}

	// Check if user has stats in this guild
	const userStats = await db
		.select()
		.from(guildUserStats)
		.where(and(eq(guildUserStats.guildId, guildId), eq(guildUserStats.discordId, discordId)))
		.get()

	if (!userStats) {
		return c.json({ message: 'User stats not found' }, 404)
	}

	// Get history with pagination
	const history = await db
		.select({
			matchId: guildUserMatchHistory.matchId,
			result: guildUserMatchHistory.result,
			ratingChange: guildUserMatchHistory.ratingChange,
			ratingAfter: guildUserMatchHistory.ratingAfter,
			createdAt: guildUserMatchHistory.createdAt,
		})
		.from(guildUserMatchHistory)
		.where(and(eq(guildUserMatchHistory.guildId, guildId), eq(guildUserMatchHistory.discordId, discordId)))
		.orderBy(desc(guildUserMatchHistory.createdAt))
		.limit(limit)
		.offset(offset)

	// Get total count
	const totalResult = await db
		.select({ total: count() })
		.from(guildUserMatchHistory)
		.where(and(eq(guildUserMatchHistory.guildId, guildId), eq(guildUserMatchHistory.discordId, discordId)))

	return c.json({ history, total: totalResult[0]?.total ?? 0 }, 200)
})

export default app
