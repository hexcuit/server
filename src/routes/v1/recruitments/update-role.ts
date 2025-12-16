import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { and, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { HTTPException } from 'hono/http-exception'
import type { LolRole } from '@/constants'
import { recruitmentParticipants } from '@/db/schema'
import { ParticipantPathParamsSchema, UpdateRoleBodySchema, UpdateRoleResponseSchema } from './schemas'

const updateRoleRoute = createRoute({
	method: 'patch',
	path: '/{id}/participants/{discordId}',
	tags: ['Recruitments'],
	summary: 'Update participant role',
	description: 'Update the role of a participant',
	request: {
		params: ParticipantPathParamsSchema,
		body: {
			content: {
				'application/json': {
					schema: UpdateRoleBodySchema,
				},
			},
		},
	},
	responses: {
		200: {
			description: 'Role updated successfully',
			content: {
				'application/json': {
					schema: UpdateRoleResponseSchema,
				},
			},
		},
	},
})

export const updateRoleRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().openapi(updateRoleRoute, async (c) => {
	const { id, discordId } = c.req.valid('param')
	const { mainRole, subRole } = c.req.valid('json')
	const db = drizzle(c.env.DB)

	const existing = await db
		.select()
		.from(recruitmentParticipants)
		.where(and(eq(recruitmentParticipants.recruitmentId, id), eq(recruitmentParticipants.discordId, discordId)))
		.get()

	if (!existing) {
		throw new HTTPException(404, { message: 'Participant not found' })
	}

	const updateData: { mainRole?: LolRole | null; subRole?: LolRole | null } = {}
	if (mainRole !== undefined) updateData.mainRole = mainRole
	if (subRole !== undefined) updateData.subRole = subRole

	if (Object.keys(updateData).length > 0) {
		await db
			.update(recruitmentParticipants)
			.set(updateData)
			.where(and(eq(recruitmentParticipants.recruitmentId, id), eq(recruitmentParticipants.discordId, discordId)))
	}

	const updated = await db
		.select()
		.from(recruitmentParticipants)
		.where(and(eq(recruitmentParticipants.recruitmentId, id), eq(recruitmentParticipants.discordId, discordId)))
		.get()

	return c.json({
		participant: {
			discordId,
			mainRole: updated?.mainRole || null,
			subRole: updated?.subRole || null,
		},
	})
})
