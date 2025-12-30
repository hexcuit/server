import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { guilds, guildUserStats } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
	})
	.openapi('DeleteGuildStatsParam')

const route = createRoute({
	method: 'delete',
	path: '/v1/guilds/{guildId}/stats',
	tags: ['GuildStats'],
	summary: 'Delete all user stats in guild',
	description: 'Delete all user stats in guild (reset all rankings)',
	request: {
		params: ParamSchema,
	},
	responses: {
		204: {
			description: 'All user stats deleted',
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

	return c.body(null, 204)
})

export default app
