import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { drizzle } from 'drizzle-orm/d1'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { guildSettings } from '@/db/schema'
import { ensureGuild } from '@/utils/ensure'

const ParamSchema = z
	.object({
		guildId: z.string().openapi({ description: 'Guild ID' }),
	})
	.openapi('UpdateGuildSettingsParam')

const BodySchema = createInsertSchema(guildSettings)
	.pick({ initialRating: true, kFactor: true, kFactorPlacement: true, placementGamesRequired: true })
	.partial()
	.openapi('UpdateGuildSettingsBody')

const ResponseSchema = createSelectSchema(guildSettings)
	.pick({ initialRating: true, kFactor: true, kFactorPlacement: true, placementGamesRequired: true, updatedAt: true })
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
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { guildId } = c.req.valid('param')
	const body = c.req.valid('json')
	const db = drizzle(c.env.DB)

	// Ensure guild exists
	await ensureGuild(db, guildId)

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
			kFactorPlacement: guildSettings.kFactorPlacement,
			placementGamesRequired: guildSettings.placementGamesRequired,
			updatedAt: guildSettings.updatedAt,
		})) as [
		Pick<
			typeof guildSettings.$inferSelect,
			'initialRating' | 'kFactor' | 'kFactorPlacement' | 'placementGamesRequired' | 'updatedAt'
		>,
	]

	return c.json(
		{
			initialRating: settings.initialRating,
			kFactor: settings.kFactor,
			kFactorPlacement: settings.kFactorPlacement,
			placementGamesRequired: settings.placementGamesRequired,
			updatedAt: settings.updatedAt,
		},
		200,
	)
})

export default app
