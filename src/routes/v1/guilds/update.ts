import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { guilds } from '@/db/schema'
import { ensureGuild } from '@/utils/ensure'

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
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId } = c.req.valid('param')
	const body = c.req.valid('json')
	const db = drizzle(c.env.DB)

	// Ensure guild exists
	await ensureGuild(db, guildId)

	const updateData: { plan?: 'free' | 'premium'; planExpiresAt?: Date | null } = {}

	if (body.plan !== undefined) {
		updateData.plan = body.plan
	}
	if (body.planExpiresAt !== undefined) {
		updateData.planExpiresAt = body.planExpiresAt ? new Date(body.planExpiresAt) : null
	}

	const [guild] = (await db.update(guilds).set(updateData).where(eq(guilds.guildId, guildId)).returning({
		guildId: guilds.guildId,
		plan: guilds.plan,
		planExpiresAt: guilds.planExpiresAt,
		updatedAt: guilds.updatedAt,
	})) as [typeof guilds.$inferSelect]

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
