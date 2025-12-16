import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { drizzle } from 'drizzle-orm/d1'
import { guildPendingMatches, users } from '@/db/schema'
import { CreateMatchBodySchema, CreateMatchResponseSchema, GuildIdParamSchema } from '../schemas'

const createMatchRoute = createRoute({
	method: 'post',
	path: '/',
	tags: ['Guild Matches'],
	summary: 'Create match',
	description: 'Create a match to start voting',
	request: {
		params: GuildIdParamSchema,
		body: { content: { 'application/json': { schema: CreateMatchBodySchema } } },
	},
	responses: {
		201: {
			description: 'Match created',
			content: { 'application/json': { schema: CreateMatchResponseSchema } },
		},
	},
})

export const createMatchRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(
	createMatchRoute,
	async (c) => {
		const { guildId } = c.req.valid('param')
		const { id, channelId, messageId, teamAssignments } = c.req.valid('json')
		const db = drizzle(c.env.DB)

		const discordIds = Object.keys(teamAssignments)
		for (const discordId of discordIds) {
			await db.insert(users).values({ discordId }).onConflictDoNothing()
		}

		await db.insert(guildPendingMatches).values({
			id,
			guildId,
			channelId,
			messageId,
			status: 'voting',
			teamAssignments: JSON.stringify(teamAssignments),
			blueVotes: 0,
			redVotes: 0,
		})

		return c.json({ matchId: id }, 201)
	},
)
