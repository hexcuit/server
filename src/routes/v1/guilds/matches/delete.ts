import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { HTTPException } from 'hono/http-exception'
import { guildPendingMatches } from '@/db/schema'
import { DeleteMatchResponseSchema, MatchIdParamSchema } from '../schemas'

const deleteMatchRoute = createRoute({
	method: 'delete',
	path: '/{matchId}',
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
		},
		404: {
			description: 'Match not found',
		},
	},
})

export const deleteMatchRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(
	deleteMatchRoute,
	async (c) => {
		const { matchId } = c.req.valid('param')
		const db = drizzle(c.env.DB)

		const match = await db.select().from(guildPendingMatches).where(eq(guildPendingMatches.id, matchId)).get()

		if (!match) {
			throw new HTTPException(404, { message: 'Match not found' })
		}

		if (match.status !== 'voting') {
			throw new HTTPException(400, { message: 'Match is not in voting state' })
		}

		await db.update(guildPendingMatches).set({ status: 'cancelled' }).where(eq(guildPendingMatches.id, matchId))

		return c.json({ deleted: true })
	},
)
