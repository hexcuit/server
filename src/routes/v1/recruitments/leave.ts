import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { HTTPException } from 'hono/http-exception'
import { recruitmentParticipants, recruitments } from '@/db/schema'
import { LeaveResponseSchema, ParticipantPathParamsSchema } from './schemas'

const leaveRecruitmentRoute = createRoute({
	method: 'delete',
	path: '/{id}/participants/{discordId}',
	tags: ['Recruitments'],
	summary: 'Leave recruitment',
	description: 'Leave a recruitment',
	request: {
		params: ParticipantPathParamsSchema,
	},
	responses: {
		200: {
			description: 'Successfully left recruitment',
			content: {
				'application/json': {
					schema: LeaveResponseSchema,
				},
			},
		},
	},
})

export const leaveRecruitmentRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(
	leaveRecruitmentRoute,
	async (c) => {
		const { id, discordId } = c.req.valid('param')
		const db = drizzle(c.env.DB)

		const existing = await db
			.select()
			.from(recruitmentParticipants)
			.where(and(eq(recruitmentParticipants.recruitmentId, id), eq(recruitmentParticipants.discordId, discordId)))
			.get()

		if (!existing) {
			throw new HTTPException(404, { message: 'Participant not found' })
		}

		await db
			.delete(recruitmentParticipants)
			.where(and(eq(recruitmentParticipants.recruitmentId, id), eq(recruitmentParticipants.discordId, discordId)))

		const recruitment = await db.select().from(recruitments).where(eq(recruitments.id, id)).get()

		if (recruitment?.status === 'full') {
			await db.update(recruitments).set({ status: 'open' }).where(eq(recruitments.id, id))
		}

		const participants = await db
			.select()
			.from(recruitmentParticipants)
			.where(eq(recruitmentParticipants.recruitmentId, id))

		return c.json({ count: participants.length })
	},
)
