import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, desc, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { guildMatches, guildMatchParticipants } from '@/db/schema'
import { GetHistoryQuerySchema, GetMatchHistoryResponseSchema, UserHistoryParamSchema } from '../schemas'

const getHistoryRoute = createRoute({
	method: 'get',
	path: '/',
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

export const getHistoryRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(getHistoryRoute, async (c) => {
	const { guildId, discordId } = c.req.valid('param')
	const { limit } = c.req.valid('query')
	const db = drizzle(c.env.DB)

	const participations = await db
		.select({
			matchId: guildMatchParticipants.matchId,
			team: guildMatchParticipants.team,
			role: guildMatchParticipants.role,
			ratingBefore: guildMatchParticipants.ratingBefore,
			ratingAfter: guildMatchParticipants.ratingAfter,
			winningTeam: guildMatches.winningTeam,
			createdAt: guildMatches.createdAt,
		})
		.from(guildMatchParticipants)
		.innerJoin(guildMatches, eq(guildMatchParticipants.matchId, guildMatches.id))
		.where(and(eq(guildMatches.guildId, guildId), eq(guildMatchParticipants.discordId, discordId)))
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
