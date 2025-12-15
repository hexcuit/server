import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { HTTPException } from 'hono/http-exception'
import { recruitmentParticipants, recruitments } from '@/db/schema'
import { GetRecruitmentResponseSchema } from './schemas'

const getRecruitmentRoute = createRoute({
	method: 'get',
	path: '/{id}',
	tags: ['Recruitment'],
	summary: '募集取得',
	description: '募集の詳細情報を取得します',
	request: {
		params: z.object({ id: z.string().uuid() }),
	},
	responses: {
		200: {
			description: '募集情報の取得に成功',
			content: { 'application/json': { schema: GetRecruitmentResponseSchema } },
		},
	},
})

export const getRecruitmentRouter = new OpenAPIHono<{
	Bindings: Cloudflare.Env
}>().openapi(getRecruitmentRoute, async (c) => {
	const recruitmentId = c.req.valid('param').id
	const db = drizzle(c.env.DB)

	const recruitment = await db.select().from(recruitments).where(eq(recruitments.id, recruitmentId)).get()

	if (!recruitment) {
		throw new HTTPException(404, { message: 'Recruitment not found' })
	}

	const participants = await db
		.select()
		.from(recruitmentParticipants)
		.where(eq(recruitmentParticipants.recruitmentId, recruitmentId))

	return c.json({
		recruitment,
		participants,
		count: participants.length,
	})
})
