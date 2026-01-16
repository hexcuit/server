import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { count, desc, eq } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-zod'

import { createDb } from '@/db'
import { guilds, guildUserStats } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = createSelectSchema(guilds).pick({ guildId: true }).openapi('GetRankingsParam')

const QuerySchema = z
	.object({
		limit: z.coerce
			.number()
			.int()
			.min(1)
			.max(100)
			.default(10)
			.openapi({ description: 'Number of results' }),
		offset: z.coerce
			.number()
			.int()
			.min(0)
			.default(0)
			.openapi({ description: 'Offset for pagination' }),
	})
	.openapi('GetRankingsQuery')

const RankingItemSchema = createSelectSchema(guildUserStats)
	.pick({
		discordId: true,
		rating: true,
		wins: true,
		losses: true,
	})
	.extend({
		rank: z.number().int(),
	})
	.openapi('RankingItem')

const ResponseSchema = z
	.object({
		rankings: z.array(RankingItemSchema),
		total: z.number().int(),
	})
	.openapi('GetRankingsResponse')

const route = createRoute({
	method: 'get',
	path: '/v1/guilds/{guildId}/rankings',
	tags: ['Stats'],
	summary: 'Get guild rankings',
	description: 'Get guild rankings',
	request: {
		params: ParamSchema,
		query: QuerySchema,
	},
	responses: {
		200: {
			description: 'Guild rankings',
			content: { 'application/json': { schema: ResponseSchema } },
		},
		404: {
			description: 'Guild not found',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId } = c.req.valid('param')
	const { limit, offset } = c.req.valid('query')
	const db = createDb(c.env.HYPERDRIVE.connectionString)

	// Check if guild exists
	const [guild] = await db.select().from(guilds).where(eq(guilds.guildId, guildId))

	if (!guild) {
		return c.json({ message: 'Guild not found' }, 404)
	}

	// Get total count
	const totalResult = await db
		.select({ total: count() })
		.from(guildUserStats)
		.where(eq(guildUserStats.guildId, guildId))

	const total = totalResult[0]?.total ?? 0

	// Get rankings
	const stats = await db
		.select({
			discordId: guildUserStats.discordId,
			rating: guildUserStats.rating,
			wins: guildUserStats.wins,
			losses: guildUserStats.losses,
		})
		.from(guildUserStats)
		.where(eq(guildUserStats.guildId, guildId))
		.orderBy(desc(guildUserStats.rating))
		.limit(limit)
		.offset(offset)

	const rankings = stats.map((stat, index) => ({
		...stat,
		rank: offset + index + 1,
	}))

	return c.json({ rankings, total }, 200)
})

export default app
