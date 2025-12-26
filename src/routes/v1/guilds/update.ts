import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { guilds } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
	})
	.openapi('UpdateGuildParam')

const BodySchema = createInsertSchema(guilds)
	.pick({ plan: true, planExpiresAt: true })
	.partial()
	.openapi('UpdateGuildBody')

const ResponseSchema = createSelectSchema(guilds)
	.pick({ guildId: true, plan: true, planExpiresAt: true, updatedAt: true })
	.openapi('UpdateGuildResponse')

const route = createRoute({
	method: 'patch',
	path: '/v1/guilds/{guildId}',
	tags: ['Guilds'],
	summary: 'Update guild',
	description: 'Update guild plan',
	request: {
		params: ParamSchema,
		body: { content: { 'application/json': { schema: BodySchema } } },
	},
	responses: {
		200: {
			description: 'Guild updated',
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
	const body = c.req.valid('json')
	const db = drizzle(c.env.DB)

	const updateData: { plan?: 'free' | 'premium'; planExpiresAt?: Date | null } = {}

	if (body.plan !== undefined) {
		updateData.plan = body.plan
	}
	if (body.planExpiresAt !== undefined) {
		updateData.planExpiresAt = body.planExpiresAt ? new Date(body.planExpiresAt) : null
	}

	const [guild] = await db.update(guilds).set(updateData).where(eq(guilds.guildId, guildId)).returning({
		guildId: guilds.guildId,
		plan: guilds.plan,
		planExpiresAt: guilds.planExpiresAt,
		updatedAt: guilds.updatedAt,
	})

	if (!guild) {
		return c.json({ message: 'Guild not found' }, 404)
	}

	return c.json(
		{
			guildId: guild.guildId,
			plan: guild.plan,
			planExpiresAt: guild.planExpiresAt,
			updatedAt: guild.updatedAt,
		},
		200,
	)
})

export default app
