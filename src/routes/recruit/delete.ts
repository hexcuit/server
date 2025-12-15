import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { recruitments } from '@/db/schema'
import { SuccessResponseSchema } from './schemas'

const deleteRecruitmentRoute = createRoute({
	method: 'delete',
	path: '/{id}',
	tags: ['Recruitment'],
	summary: '募集終了',
	description: '募集を終了し、物理削除します',
	request: {
		params: z.object({ id: z.string().uuid() }),
	},
	responses: {
		200: {
			description: '削除成功',
			content: { 'application/json': { schema: SuccessResponseSchema } },
		},
	},
})

export const deleteRecruitmentRouter = new OpenAPIHono<{
	Bindings: Cloudflare.Env
}>().openapi(deleteRecruitmentRoute, async (c) => {
	const recruitmentId = c.req.valid('param').id
	const db = drizzle(c.env.DB)

	// CASCADE設定により recruitment_participants も自動削除される
	await db.delete(recruitments).where(eq(recruitments.id, recruitmentId))

	return c.json({ success: true })
})
