import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, desc, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { guildMatches, guildMatchParticipants } from '@/db/schema'
import { GetMatchHistoryQuerySchema, GetMatchHistoryResponseSchema } from './schemas'

const getMatchHistoryRoute = createRoute({
	method: 'get',
	path: '/match-history',
	tags: ['Guild Rating'],
	summary: '試合履歴取得',
	description: 'ユーザーの試合履歴を取得します',
	request: { query: GetMatchHistoryQuerySchema },
	responses: {
		200: {
			description: '履歴取得成功',
			content: { 'application/json': { schema: GetMatchHistoryResponseSchema } },
		},
	},
})

export const getMatchHistoryRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(
	getMatchHistoryRoute,
	async (c) => {
		const { guildId, discordId, limit } = c.req.valid('query')
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
	},
)
