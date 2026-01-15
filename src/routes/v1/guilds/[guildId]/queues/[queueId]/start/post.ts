import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { z } from 'zod'

import { LOL_ROLES } from '@/constants'
import {
	guildMatches,
	guildMatchPlayers,
	guildQueuePlayers,
	guildQueues,
	guildSettings,
	guildUserStats,
} from '@/db/schema'
import { balanceTeamsByElo } from '@/services/teamBalance'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
		queueId: z.string().openapi({ description: 'Queue ID' }),
	})
	.openapi('StartQueueParam')

const TeamAssignmentSchema = z.object({
	team: z.enum(['BLUE', 'RED']),
	role: z.enum(LOL_ROLES),
	rating: z.number(),
})

const ResponseSchema = z
	.object({
		match: z.object({
			id: z.string(),
			teamAssignments: z.record(z.string(), TeamAssignmentSchema),
		}),
	})
	.openapi('StartQueueResponse')

const route = createRoute({
	method: 'post',
	path: '/v1/guilds/{guildId}/queues/{queueId}/start',
	tags: ['Queues'],
	summary: 'Force start queue',
	description: 'Force start a queue (admin only). Requires at least 2 players.',
	request: {
		params: ParamSchema,
	},
	responses: {
		200: {
			description: 'Match started',
			content: { 'application/json': { schema: ResponseSchema } },
		},
		400: {
			description: 'Queue is closed or not enough players',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
		404: {
			description: 'Queue not found',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId, queueId } = c.req.valid('param')
	const db = drizzle(c.env.DB)

	return await db.transaction(async (tx) => {
		// Check if queue exists
		const queue = await tx
			.select()
			.from(guildQueues)
			.where(and(eq(guildQueues.id, queueId), eq(guildQueues.guildId, guildId)))
			.get()

		if (!queue) {
			return c.json({ message: 'Queue not found' }, 404)
		}

		// Check status
		if (queue.status !== 'open') {
			return c.json({ message: 'Queue is closed' }, 400)
		}

		// Get current players
		const currentPlayers = await tx
			.select()
			.from(guildQueuePlayers)
			.where(eq(guildQueuePlayers.queueId, queueId))

		// Check minimum players
		if (currentPlayers.length < 2) {
			return c.json({ message: 'Not enough players (minimum 2)' }, 400)
		}

		// Get settings for initial rating
		const settings = await tx
			.select()
			.from(guildSettings)
			.where(eq(guildSettings.guildId, guildId))
			.get()

		const initialRating = settings?.initialRating ?? 1200

		// Get stats for all players
		const playerStats = await Promise.all(
			currentPlayers.map(async (p) => {
				const stats = await tx
					.select()
					.from(guildUserStats)
					.where(
						and(eq(guildUserStats.guildId, guildId), eq(guildUserStats.discordId, p.discordId)),
					)
					.get()

				return {
					discordId: p.discordId,
					mainRole: p.mainRole,
					subRole: p.subRole,
					rating: stats?.rating ?? initialRating,
				}
			}),
		)

		// Balance teams
		const teamAssignments = balanceTeamsByElo(playerStats)

		// Create match
		const [match] = await tx
			.insert(guildMatches)
			.values({
				guildId,
				channelId: queue.channelId,
				messageId: queue.messageId,
				status: 'voting',
			})
			.returning({ id: guildMatches.id })

		if (!match) {
			return c.json({ message: 'Failed to create match' }, 400)
		}

		// Add match players
		await tx.insert(guildMatchPlayers).values(
			Object.entries(teamAssignments).map(([discordId, assignment]) => ({
				matchId: match.id,
				discordId,
				team: assignment.team,
				role: assignment.role,
				ratingBefore: assignment.rating,
			})),
		)

		// Delete queue (cascade deletes queue players)
		await tx.delete(guildQueues).where(eq(guildQueues.id, queueId))

		return c.json(
			{
				match: {
					id: match.id,
					teamAssignments,
				},
			},
			200,
		)
	})
})

export default app
