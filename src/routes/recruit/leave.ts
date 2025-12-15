import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { HTTPException } from 'hono/http-exception'
import { recruitmentParticipants, recruitments } from '@/db/schema'
import { LeaveRecruitmentSchema, LeaveResponseSchema } from './schemas'

const leaveRecruitmentRoute = createRoute({
	method: 'post',
	path: '/leave',
	tags: ['Recruitment'],
	summary: 'キャンセル',
	description: '募集への参加をキャンセルします',
	request: {
		body: { content: { 'application/json': { schema: LeaveRecruitmentSchema } } },
	},
	responses: {
		200: {
			description: 'キャンセル成功',
			content: { 'application/json': { schema: LeaveResponseSchema } },
		},
	},
})

export const leaveRecruitmentRouter = new OpenAPIHono<{
	Bindings: Cloudflare.Env
}>().openapi(leaveRecruitmentRoute, async (c) => {
	const { recruitmentId, discordId } = c.req.valid('json')
	const db = drizzle(c.env.DB)

	const existing = await db
		.select()
		.from(recruitmentParticipants)
		.where(
			and(eq(recruitmentParticipants.recruitmentId, recruitmentId), eq(recruitmentParticipants.discordId, discordId)),
		)
		.get()

	if (!existing) {
		throw new HTTPException(400, { message: 'Not joined' })
	}

	await db
		.delete(recruitmentParticipants)
		.where(
			and(eq(recruitmentParticipants.recruitmentId, recruitmentId), eq(recruitmentParticipants.discordId, discordId)),
		)

	const recruitment = await db.select().from(recruitments).where(eq(recruitments.id, recruitmentId)).get()

	if (recruitment?.status === 'full') {
		await db.update(recruitments).set({ status: 'open' }).where(eq(recruitments.id, recruitmentId))
	}

	const participants = await db
		.select()
		.from(recruitmentParticipants)
		.where(eq(recruitmentParticipants.recruitmentId, recruitmentId))

	return c.json({
		success: true,
		count: participants.length,
		participants: participants.map((p) => ({
			discordId: p.discordId,
			mainRole: p.mainRole,
			subRole: p.subRole,
		})),
	})
})
