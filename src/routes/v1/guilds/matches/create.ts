import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { drizzle } from 'drizzle-orm/d1'
import { guildPendingMatches, guilds, users } from '@/db/schema'
import { CreateMatchBodySchema, CreateMatchResponseSchema, GuildParamSchema } from '../schemas'

const route = createRoute({
	method: 'post',
	path: '/v1/guilds/{guildId}/matches',
	tags: ['Guild Matches'],
	summary: 'Create match',
	description: 'Create a match to start voting',
	request: {
		params: GuildParamSchema,
		body: { content: { 'application/json': { schema: CreateMatchBodySchema } } },
	},
	responses: {
		201: {
			description: 'Match created',
			content: { 'application/json': { schema: CreateMatchResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId } = c.req.valid('param')
	const { id, channelId, messageId, teamAssignments } = c.req.valid('json')
	const db = drizzle(c.env.DB)

	const discordIds = Object.keys(teamAssignments)
	for (const discordId of discordIds) {
		await db.insert(users).values({ discordId }).onConflictDoNothing()
	}
	await db.insert(guilds).values({ guildId }).onConflictDoNothing()

	await db.insert(guildPendingMatches).values({
		id,
		guildId,
		channelId,
		messageId,
		status: 'voting',
		teamAssignments: JSON.stringify(teamAssignments),
		blueVotes: 0,
		redVotes: 0,
		drawVotes: 0,
	})

	return c.json({ matchId: id }, 201)
})

export default app
