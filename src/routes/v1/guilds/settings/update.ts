import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { createSelectSchema } from 'drizzle-zod'
import { guildSettings, guilds } from '@/db/schema'
import { ErrorResponseSchema } from '@/utils/schemas'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
	})
	.openapi('UpdateGuildSettingsParam')

const BodySchema = z
	.object({
		initialRating: z.number().int().positive().optional(),
		kFactor: z.number().int().positive().optional(),
		placementGamesRequired: z.number().int().min(0).optional(),
	})
	.openapi('UpdateGuildSettingsBody')

const ResponseSchema = createSelectSchema(guildSettings)
	.pick({ initialRating: true, kFactor: true, placementGamesRequired: true })
	.extend({
		updatedAt: z.string(),
	})
	.openapi('UpdateGuildSettingsResponse')

const route = createRoute({
	method: 'patch',
	path: '/v1/guilds/{guildId}/settings',
	tags: ['GuildSettings'],
	summary: 'Update guild settings',
	description: 'Update guild settings',
	request: {
		params: ParamSchema,
		body: { content: { 'application/json': { schema: BodySchema } } },
	},
	responses: {
		200: {
			description: 'Guild settings updated',
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

	// Check if guild exists
	const guild = await db.select().from(guilds).where(eq(guilds.guildId, guildId)).get()

	if (!guild) {
		return c.json({ message: 'Guild not found' }, 404)
	}

	// Upsert settings
	const [settings] = (await db
		.insert(guildSettings)
		.values({
			guildId,
			...body,
		})
		.onConflictDoUpdate({
			target: guildSettings.guildId,
			set: body,
		})
		.returning({
			initialRating: guildSettings.initialRating,
			kFactor: guildSettings.kFactor,
			placementGamesRequired: guildSettings.placementGamesRequired,
			updatedAt: guildSettings.updatedAt,
		})) as [
		Pick<typeof guildSettings.$inferSelect, 'initialRating' | 'kFactor' | 'placementGamesRequired' | 'updatedAt'>,
	]

	return c.json(
		{
			initialRating: settings.initialRating,
			kFactor: settings.kFactor,
			placementGamesRequired: settings.placementGamesRequired,
			updatedAt: settings.updatedAt.toISOString(),
		},
		200,
	)
})

export default app
