import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, desc, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { guildMatches, guildMatchPlayers } from '@/db/schema'
import { GetHistoryQuerySchema, GetMatchHistoryResponseSchema, UserHistoryParamSchema } from '../schemas'

const route = createRoute({
	method: 'get',
	path: '/v1/guilds/{guildId}/users/{discordId}',
	tags: ['Guild Users'],
	summary: 'Get match history',
	description: 'Get user match history',
	request: {
		params: UserHistoryParamSchema,
		query: GetHistoryQuerySchema,
	},
	responses: {
		200: {
			description: 'Successfully retrieved history',
			content: { 'application/json': { schema: GetMatchHistoryResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId, discordId } = c.req.valid('param')
	const { limit } = c.req.valid('query')
	const db = drizzle(c.env.DB)

	const participations = await db
		.select({
			matchId: guildMatchPlayers.matchId,
			team: guildMatchPlayers.team,
			role: guildMatchPlayers.role,
			ratingBefore: guildMatchPlayers.ratingBefore,
			ratingAfter: guildMatchPlayers.ratingAfter,
			winningTeam: guildMatches.winningTeam,
			createdAt: guildMatches.createdAt,
		})
		.from(guildMatchPlayers)
		.innerJoin(guildMatches, eq(guildMatchPlayers.matchId, guildMatches.id))
		.where(and(eq(guildMatches.guildId, guildId), eq(guildMatchPlayers.discordId, discordId)))
		.orderBy(desc(guildMatches.createdAt))
		.limit(limit)

	const history = participations.map((p) => ({
		matchId: p.matchId,
		team: p.team,
		role: p.role,
		ratingBefore: p.ratingBefore,
		ratingAfter: p.ratingAfter,
		change: p.ratingAfter - p.ratingBefore,
		won: p.team === p.winningTeam,
		createdAt: p.createdAt,
	}))

	return c.json({ guildId, discordId, history })
})

export default app
