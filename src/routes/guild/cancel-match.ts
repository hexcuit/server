import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { HTTPException } from 'hono/http-exception'
import { guildPendingMatches } from '@/db/schema'
import { SuccessResponseSchema } from './schemas'

const cancelMatchRoute = createRoute({
	method: 'delete',
	path: '/match/{id}',
	tags: ['Guild Rating'],
	summary: '試合キャンセル',
	description: '投票中の試合をキャンセルします',
	request: {
		params: z.object({ id: z.string().uuid() }),
	},
	responses: {
		200: {
			description: 'キャンセル成功',
			content: { 'application/json': { schema: SuccessResponseSchema } },
		},
	},
})

export const cancelMatchRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(
	cancelMatchRoute,
	async (c) => {
		const matchId = c.req.valid('param').id
		const db = drizzle(c.env.DB)

		const match = await db.select().from(guildPendingMatches).where(eq(guildPendingMatches.id, matchId)).get()

		if (!match) {
			throw new HTTPException(404, { message: 'Match not found' })
		}

		if (match.status !== 'voting') {
			throw new HTTPException(400, { message: 'Match is not in voting state' })
		}

		await db.update(guildPendingMatches).set({ status: 'cancelled' }).where(eq(guildPendingMatches.id, matchId))

		return c.json({ success: true })
	},
)
