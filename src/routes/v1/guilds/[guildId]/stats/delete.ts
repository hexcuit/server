import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { createSelectSchema } from 'drizzle-zod'

import { guilds, guildUserMatchHistory, guildUserStats } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = createSelectSchema(guilds)
	.pick({ guildId: true })
	.openapi('DeleteGuildStatsParam')

const route = createRoute({
	method: 'delete',
	path: '/v1/guilds/{guildId}/stats',
	tags: ['Stats'],
	summary: 'Reset all user stats in guild',
	description: 'ギルド全体のスタッツと履歴をリセットする',
	request: {
		params: ParamSchema,
	},
	responses: {
		204: {
			description: 'All stats reset',
		},
		404: {
			description: 'Guild not found',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId } = c.req.valid('param')
	const db = drizzle(c.env.DB)

	// Check if guild exists
	const guild = await db.select().from(guilds).where(eq(guilds.guildId, guildId)).get()

	if (!guild) {
		return c.json({ message: 'Guild not found' }, 404)
	}

	// Delete all stats for this guild
	await db.delete(guildUserStats).where(eq(guildUserStats.guildId, guildId))

	// Delete all match history for this guild
	await db.delete(guildUserMatchHistory).where(eq(guildUserMatchHistory.guildId, guildId))

	return c.body(null, 204)
})

export default app
