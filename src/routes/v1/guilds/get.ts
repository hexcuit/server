import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { createSelectSchema } from 'drizzle-zod'
import { guilds } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
	})
	.openapi('GetGuildParam')

const ResponseSchema = createSelectSchema(guilds)
	.pick({ guildId: true, plan: true, planExpiresAt: true, createdAt: true })
	.openapi('GetGuildResponse')

const route = createRoute({
	method: 'get',
	path: '/v1/guilds/{guildId}',
	tags: ['Guilds'],
	summary: 'Get guild',
	description: 'Get guild by ID',
	request: {
		params: ParamSchema,
	},
	responses: {
		200: {
			description: 'Guild found',
			content: { 'application/json': { schema: ResponseSchema } },
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

	const guild = await db
		.select({
			guildId: guilds.guildId,
			plan: guilds.plan,
			planExpiresAt: guilds.planExpiresAt,
			createdAt: guilds.createdAt,
		})
		.from(guilds)
		.where(eq(guilds.guildId, guildId))
		.get()

	if (!guild) {
		return c.json({ message: 'Guild not found' }, 404)
	}

	return c.json(
		{
			guildId: guild.guildId,
			plan: guild.plan,
			planExpiresAt: guild.planExpiresAt,
			createdAt: guild.createdAt,
		},
		200,
	)
})

export default app
