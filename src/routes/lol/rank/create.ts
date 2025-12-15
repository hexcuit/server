import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { drizzle } from 'drizzle-orm/d1'
import { lolRank, users } from '@/db/schema'
import { CreateRankResponseSchema, RankSchema } from './schemas'

const createRankRoute = createRoute({
	method: 'post',
	path: '/',
	tags: ['LoL Rank'],
	summary: 'LoLランクを登録',
	description: 'Discord IDに紐づくLoLランク情報を登録・更新します',
	request: {
		body: {
			content: {
				'application/json': {
					schema: RankSchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'ランク登録成功',
			content: {
				'application/json': {
					schema: CreateRankResponseSchema,
				},
			},
		},
	},
})

export const createRankRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(createRankRoute, async (c) => {
	const { discordId, tier, division } = c.req.valid('json')

	const db = drizzle(c.env.DB)

	await db
		.insert(users)
		.values({
			discordId,
		})
		.onConflictDoNothing()

	await db.insert(lolRank).values({ discordId, tier, division }).onConflictDoUpdate({
		target: lolRank.discordId,
		set: { tier, division },
	})

	return c.json({ message: 'ランクが正常に登録されました。' })
})
