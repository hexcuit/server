import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { guilds, guildUserStats } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
		discordId: z.string().openapi({ description: 'Discord User ID' }),
	})
	.openapi('DeleteGuildUserStatsParam')

const route = createRoute({
	method: 'delete',
	path: '/v1/guilds/{guildId}/users/{discordId}/stats',
	tags: ['GuildUserStats'],
	summary: 'Delete user stats in guild',
	description: 'Delete user stats in guild (reset)',
	request: {
		params: ParamSchema,
	},
	responses: {
		204: {
			description: 'User stats deleted',
		},
		404: {
			description: 'Guild or stats not found',
			content: { 'application/json': { schema: ErrorResponseSchema } },
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId, discordId } = c.req.valid('param')
	const db = drizzle(c.env.DB)

	// Check if guild exists
	const guild = await db.select().from(guilds).where(eq(guilds.guildId, guildId)).get()

	if (!guild) {
		return c.json({ message: 'Guild not found' }, 404)
	}

	// Delete stats
	const result = await db
		.delete(guildUserStats)
		.where(and(eq(guildUserStats.guildId, guildId), eq(guildUserStats.discordId, discordId)))
		.returning({ discordId: guildUserStats.discordId })

	if (result.length === 0) {
		return c.json({ message: 'Stats not found' }, 404)
	}

	return c.body(null, 204)
})

export default app
