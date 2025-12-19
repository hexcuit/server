import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { hc } from 'hono/client'
import { guildPendingMatches } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'
import { DeleteMatchResponseSchema, MatchIdParamSchema } from '../schemas'

const route = createRoute({
	method: 'delete',
	path: '/v1/guilds/{guildId}/matches/{matchId}',
	tags: ['Guild Matches'],
	summary: 'Cancel match',
	description: 'Cancel a match in voting state',
	request: {
		params: MatchIdParamSchema,
	},
	responses: {
		200: {
			description: 'Match cancelled',
			content: { 'application/json': { schema: DeleteMatchResponseSchema } },
		},
		400: {
			description: 'Match is not in voting state',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
		404: {
			description: 'Match not found',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId, matchId } = c.req.valid('param')
	const db = drizzle(c.env.DB)

	const match = await db.select().from(guildPendingMatches).where(eq(guildPendingMatches.id, matchId)).get()

	if (!match) {
		return c.json({ message: 'Match not found' }, 404)
	}

	if (match.guildId !== guildId) {
		return c.json({ message: 'Match not found' }, 404)
	}

	if (match.status !== 'voting') {
		return c.json({ message: 'Match is not in voting state' }, 400)
	}

	await db.update(guildPendingMatches).set({ status: 'cancelled' }).where(eq(guildPendingMatches.id, matchId))

	return c.json({ deleted: true }, 200)
})

export default app

export const hcWithType = (...args: Parameters<typeof hc>) => hc<typeof typedApp>(...args)
