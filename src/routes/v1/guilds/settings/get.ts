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
	.openapi('GetGuildSettingsParam')

const ResponseSchema = createSelectSchema(guildSettings)
	.pick({ initialRating: true, kFactor: true, placementGamesRequired: true })
	.openapi('GetGuildSettingsResponse')

const route = createRoute({
	method: 'get',
	path: '/v1/guilds/{guildId}/settings',
	tags: ['GuildSettings'],
	summary: 'Get guild settings',
	description: 'Get guild settings by guild ID',
	request: {
		params: ParamSchema,
	},
	responses: {
		200: {
			description: 'Guild settings found',
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

	// Check if guild exists
	const guild = await db.select().from(guilds).where(eq(guilds.guildId, guildId)).get()

	if (!guild) {
		return c.json({ message: 'Guild not found' }, 404)
	}

	// Get or create settings
	let settings = await db
		.select({
			initialRating: guildSettings.initialRating,
			kFactor: guildSettings.kFactor,
			placementGamesRequired: guildSettings.placementGamesRequired,
		})
		.from(guildSettings)
		.where(eq(guildSettings.guildId, guildId))
		.get()

	if (!settings) {
		// Create default settings
		const [created] = (await db.insert(guildSettings).values({ guildId }).returning({
			initialRating: guildSettings.initialRating,
			kFactor: guildSettings.kFactor,
			placementGamesRequired: guildSettings.placementGamesRequired,
		})) as [Pick<typeof guildSettings.$inferSelect, 'initialRating' | 'kFactor' | 'placementGamesRequired'>]

		settings = created
	}

	return c.json(settings, 200)
})

export default app
