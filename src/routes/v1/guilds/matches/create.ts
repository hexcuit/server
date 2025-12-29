import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { drizzle } from 'drizzle-orm/d1'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import { guildMatches, guildMatchPlayers } from '@/db/schema'
import { ensureGuild, ensureUser } from '@/utils/ensure'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
	})
	.openapi('CreateMatchParam')

const PlayerSchema = createInsertSchema(guildMatchPlayers).pick({
	discordId: true,
	team: true,
	role: true,
	ratingBefore: true,
})

const BodySchema = z
	.object({
		channelId: z.string(),
		messageId: z.string(),
		players: z.array(PlayerSchema),
	})
	.openapi('CreateMatchBody')

const ResponseSchema = createSelectSchema(guildMatches)
	.pick({ id: true, status: true, createdAt: true })
	.openapi('CreateMatchResponse')

const route = createRoute({
	method: 'post',
	path: '/v1/guilds/{guildId}/matches',
	tags: ['Matches'],
	summary: 'Create match',
	description: 'Create a new match',
	request: {
		params: ParamSchema,
		body: { content: { 'application/json': { schema: BodySchema } } },
	},
	responses: {
		201: {
			description: 'Match created',
			content: { 'application/json': { schema: ResponseSchema } },
		},
		409: {
			description: 'Match with this messageId already exists',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId } = c.req.valid('param')
	const { channelId, messageId, players } = c.req.valid('json')
	const db = drizzle(c.env.DB)

	// Ensure guild and all players exist
	await ensureGuild(db, guildId)
	await Promise.all(players.map((p) => ensureUser(db, p.discordId)))

	// Create match
	const [match] = await db
		.insert(guildMatches)
		.values({
			guildId,
			channelId,
			messageId,
			status: 'voting',
		})
		.onConflictDoNothing()
		.returning({
			id: guildMatches.id,
			status: guildMatches.status,
			createdAt: guildMatches.createdAt,
		})

	if (!match) {
		return c.json({ message: 'Match with this messageId already exists' }, 409)
	}

	// Add players
	if (players.length > 0) {
		await db.insert(guildMatchPlayers).values(
			players.map((p) => ({
				matchId: match.id,
				...p,
			})),
		)
	}

	return c.json(match, 201)
})

export default app
