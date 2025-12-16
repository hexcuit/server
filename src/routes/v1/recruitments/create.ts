import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { drizzle } from 'drizzle-orm/d1'
import { recruitments, users } from '@/db/schema'
import { CreateRecruitmentBodySchema, CreateRecruitmentResponseSchema } from './schemas'

const createRecruitmentRoute = createRoute({
	method: 'post',
	path: '/',
	tags: ['Recruitments'],
	summary: 'Create recruitment',
	description: 'Create a new recruitment',
	request: {
		body: {
			content: {
				'application/json': {
					schema: CreateRecruitmentBodySchema,
				},
			},
		},
	},
	responses: {
		201: {
			description: 'Recruitment created successfully',
			content: {
				'application/json': {
					schema: CreateRecruitmentResponseSchema,
				},
			},
		},
	},
})

export const createRecruitmentRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(
	createRecruitmentRoute,
	async (c) => {
		const data = c.req.valid('json')
		const db = drizzle(c.env.DB)

		await db.insert(users).values({ discordId: data.creatorId }).onConflictDoNothing()

		await db.insert(recruitments).values({
			id: data.id,
			guildId: data.guildId,
			channelId: data.channelId,
			messageId: data.messageId,
			creatorId: data.creatorId,
			type: data.type,
			anonymous: data.anonymous,
			startTime: data.startTime || null,
			status: 'open',
		})

		return c.json({ recruitment: { id: data.id } }, 201)
	},
)
