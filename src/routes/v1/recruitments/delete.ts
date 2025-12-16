import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { recruitments } from '@/db/schema'
import { DeleteRecruitmentResponseSchema, RecruitmentPathParamsSchema } from './schemas'

const deleteRecruitmentRoute = createRoute({
	method: 'delete',
	path: '/{id}',
	tags: ['Recruitments'],
	summary: 'Delete recruitment',
	description: 'Delete a recruitment and all its participants (cascade)',
	request: {
		params: RecruitmentPathParamsSchema,
	},
	responses: {
		200: {
			description: 'Recruitment deleted successfully',
			content: {
				'application/json': {
					schema: DeleteRecruitmentResponseSchema,
				},
			},
		},
	},
})

export const deleteRecruitmentRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(
	deleteRecruitmentRoute,
	async (c) => {
		const { id } = c.req.valid('param')
		const db = drizzle(c.env.DB)

		await db.delete(recruitments).where(eq(recruitments.id, id))

		return c.json({ deleted: true })
	},
)
