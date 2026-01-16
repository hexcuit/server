import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { LOL_ROLES, ROLE_PREFERENCES } from '@/constants'
import { createDb } from '@/db'
import {
	guildMatches,
	guildMatchPlayers,
	guildQueuePlayers,
	guildQueues,
	guildSettings,
	guildUserStats,
} from '@/db/schema'
import { balanceTeamsByElo } from '@/services/teamBalance'
import { ensureGuild, ensureUser } from '@/utils/ensure'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
		queueId: z.string().openapi({ description: 'Queue ID' }),
	})
	.openapi('JoinQueueParam')

const BodySchema = z
	.object({
		discordId: z.string(),
		mainRole: z.enum(ROLE_PREFERENCES).optional().default('FILL'),
		subRole: z.enum(ROLE_PREFERENCES).optional().default('FILL'),
	})
	.openapi('JoinQueueBody')

const PlayerSchema = z.object({
	discordId: z.string(),
	mainRole: z.enum(ROLE_PREFERENCES),
	subRole: z.enum(ROLE_PREFERENCES),
})

const TeamAssignmentSchema = z.object({
	team: z.enum(['BLUE', 'RED']),
	role: z.enum(LOL_ROLES),
	rating: z.number(),
})

const JoinedResponseSchema = z
	.object({
		status: z.literal('joined'),
		currentCount: z.number(),
		capacity: z.number(),
		creatorId: z.string().nullable(),
		players: z.array(PlayerSchema),
	})
	.openapi('JoinQueueJoinedResponse')

const MatchStartedResponseSchema = z
	.object({
		status: z.literal('match_started'),
		creatorId: z.string().nullable(),
		match: z.object({
			id: z.string(),
			teamAssignments: z.record(z.string(), TeamAssignmentSchema),
		}),
	})
	.openapi('JoinQueueMatchStartedResponse')

const ResponseSchema = z.union([JoinedResponseSchema, MatchStartedResponseSchema])

const route = createRoute({
	method: 'post',
	path: '/v1/guilds/{guildId}/queues/{queueId}/join',
	tags: ['Queues'],
	summary: 'Join queue',
	description: 'Join a queue. Auto-starts match when full.',
	request: {
		params: ParamSchema,
		body: { content: { 'application/json': { schema: BodySchema } } },
	},
	responses: {
		201: {
			description: 'Joined queue or match started',
			content: { 'application/json': { schema: ResponseSchema } },
		},
		400: {
			description: 'Queue is closed or full',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
		404: {
			description: 'Queue not found',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
		409: {
			description: 'Already joined',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId, queueId } = c.req.valid('param')
	const body = c.req.valid('json')
	const db = createDb(c.env.HYPERDRIVE.connectionString)

	// Ensure guild and user exist (outside transaction for better error messages)
	await ensureGuild(db, guildId)
	await ensureUser(db, body.discordId)

	try {
		return await db.transaction(async (tx) => {
			// Check if queue exists
			const [queue] = await tx
				.select()
				.from(guildQueues)
				.where(and(eq(guildQueues.id, queueId), eq(guildQueues.guildId, guildId)))

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

			// Check if full (before insert to fail fast)
			if (currentPlayers.length >= queue.capacity) {
				return c.json({ message: 'Queue is full' }, 400)
			}

			// Check if already joined (for better error message, DB constraint also prevents this)
			if (currentPlayers.some((p) => p.discordId === body.discordId)) {
				return c.json({ message: 'Already joined' }, 409)
			}

			// Add player (will fail with UNIQUE constraint if race condition on same user)
			await tx.insert(guildQueuePlayers).values({
				queueId,
				discordId: body.discordId,
				mainRole: body.mainRole,
				subRole: body.subRole,
			})

			const newPlayer = {
				discordId: body.discordId,
				mainRole: body.mainRole,
				subRole: body.subRole,
			}
			const allPlayers = [...currentPlayers, newPlayer]
			const newCount = allPlayers.length

			// Check if queue is now full
			if (newCount < queue.capacity) {
				return c.json(
					{
						status: 'joined' as const,
						currentCount: newCount,
						capacity: queue.capacity,
						creatorId: queue.creatorId,
						players: allPlayers.map((p) => ({
							discordId: p.discordId,
							mainRole: p.mainRole,
							subRole: p.subRole,
						})),
					},
					201,
				)
			}

			// Queue is full - start match
			// Get settings for initial rating
			const [settings] = await tx
				.select()
				.from(guildSettings)
				.where(eq(guildSettings.guildId, guildId))

			const initialRating = settings?.initialRating ?? 1200

			// Get stats for all players
			const playerStats = await Promise.all(
				allPlayers.map(async (p) => {
					const [stats] = await tx
						.select()
						.from(guildUserStats)
						.where(
							and(eq(guildUserStats.guildId, guildId), eq(guildUserStats.discordId, p.discordId)),
						)

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
					status: 'match_started' as const,
					creatorId: queue.creatorId,
					match: {
						id: match.id,
						teamAssignments,
					},
				},
				201,
			)
		})
	} catch (error) {
		// Handle UNIQUE constraint violation (race condition on same user)
		if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
			return c.json({ message: 'Already joined' }, 409)
		}
		throw error
	}
})

export default app
