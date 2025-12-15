import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { HTTPException } from 'hono/http-exception'
import type { LolRole } from '@/constants'
import { recruitmentParticipants } from '@/db/schema'
import { JoinRecruitmentSchema, UpdateRoleResponseSchema } from './schemas'

const updateRoleRoute = createRoute({
	method: 'post',
	path: '/update-role',
	tags: ['Recruitment'],
	summary: 'ロール更新',
	description: '参加者のロールを更新します',
	request: {
		body: { content: { 'application/json': { schema: JoinRecruitmentSchema } } },
	},
	responses: {
		200: {
			description: 'ロール更新成功',
			content: { 'application/json': { schema: UpdateRoleResponseSchema } },
		},
	},
})

export const updateRoleRouter = new OpenAPIHono<{
	Bindings: Cloudflare.Env
}>().openapi(updateRoleRoute, async (c) => {
	const { recruitmentId, discordId, mainRole, subRole } = c.req.valid('json')
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

	const updateData: { mainRole?: LolRole | null; subRole?: LolRole | null } = {}
	if (mainRole !== undefined) updateData.mainRole = mainRole
	if (subRole !== undefined) updateData.subRole = subRole

	if (Object.keys(updateData).length > 0) {
		await db
			.update(recruitmentParticipants)
			.set(updateData)
			.where(
				and(eq(recruitmentParticipants.recruitmentId, recruitmentId), eq(recruitmentParticipants.discordId, discordId)),
			)
	}

	const participants = await db
		.select()
		.from(recruitmentParticipants)
		.where(eq(recruitmentParticipants.recruitmentId, recruitmentId))

	return c.json({
		success: true,
		participants: participants.map((p) => ({
			discordId: p.discordId,
			mainRole: p.mainRole,
			subRole: p.subRole,
		})),
	})
})
