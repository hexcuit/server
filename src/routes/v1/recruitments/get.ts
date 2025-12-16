import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { HTTPException } from 'hono/http-exception'
import { recruitmentParticipants, recruitments } from '@/db/schema'
import { GetRecruitmentResponseSchema, RecruitmentPathParamsSchema } from './schemas'

const getRecruitmentRoute = createRoute({
	method: 'get',
	path: '/{id}',
	tags: ['Recruitments'],
	summary: 'Get recruitment',
	description: 'Get recruitment details with participants',
	request: {
		params: RecruitmentPathParamsSchema,
	},
	responses: {
		200: {
			description: 'Recruitment retrieved successfully',
			content: {
				'application/json': {
					schema: GetRecruitmentResponseSchema,
				},
			},
		},
	},
})

export const getRecruitmentRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(
	getRecruitmentRoute,
	async (c) => {
		const { id } = c.req.valid('param')
		const db = drizzle(c.env.DB)

		const recruitment = await db.select().from(recruitments).where(eq(recruitments.id, id)).get()

		if (!recruitment) {
			throw new HTTPException(404, { message: 'Recruitment not found' })
		}

		const participants = await db
			.select()
			.from(recruitmentParticipants)
			.where(eq(recruitmentParticipants.recruitmentId, id))

		return c.json({
			recruitment,
			participants,
			count: participants.length,
		})
	},
)
