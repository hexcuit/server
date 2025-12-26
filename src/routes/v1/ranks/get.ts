import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { ranks } from '@/db/schema'
import { LoLRankSelectSchema } from './schemas'

export const QuerySchema = z
	.object({
		id: z.array(z.string()).or(z.string().transform((val) => [val])),
	})
	.openapi('GetRanksQuery')

export const ResponseSchema = z
	.object({
		ranks: z.array(LoLRankSelectSchema),
	})
	.openapi('GetRanksResponse')

const route = createRoute({
	method: 'get',
	path: '/v1/ranks',
	tags: ['LoL Ranks'],
	summary: 'Get LoL ranks',
	description: 'Get LoL rank information for a list of Discord IDs',
	request: {
		query: QuerySchema,
	},
	responses: {
		200: {
			description: 'Successfully retrieved rank information',
			content: {
				'application/json': {
					schema: ResponseSchema,
				},
			},
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	const { id } = c.req.valid('query')
	const db = drizzle(c.env.DB)

	const rank = await db.select().from(ranks).where(inArray(ranks.discordId, id))

	return c.json({ rank })
})

export default app
