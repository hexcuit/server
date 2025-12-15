import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { drizzle } from 'drizzle-orm/d1'
import { guildPendingMatches, users } from '@/db/schema'
import { CreateMatchResponseSchema, CreateMatchSchema } from './schemas'

const createMatchRoute = createRoute({
	method: 'post',
	path: '/match',
	tags: ['Guild Rating'],
	summary: '試合作成',
	description: '投票を開始するための試合を作成します',
	request: {
		body: { content: { 'application/json': { schema: CreateMatchSchema } } },
	},
	responses: {
		200: {
			description: '試合作成成功',
			content: { 'application/json': { schema: CreateMatchResponseSchema } },
		},
	},
})

export const createMatchRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(
	createMatchRoute,
	async (c) => {
		const { id, guildId, channelId, messageId, teamAssignments } = c.req.valid('json')
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

		return c.json({ success: true, matchId: id })
	},
)
