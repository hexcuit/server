import { z } from '@hono/zod-openapi'
import { LOL_ROLES } from '@/constants'

// ========== Path Parameters ==========

export const ParticipantPathParamsSchema = z
	.object({
		id: z.uuid(),
		discordId: z.string().min(1),
	})
	.openapi('ParticipantPathParams')

// ========== Request Schemas ==========

export const RoleSchema = z.enum(LOL_ROLES)

export const JoinRecruitmentBodySchema = z
	.object({
		discordId: z.string(),
		mainRole: RoleSchema.optional(),
		subRole: RoleSchema.optional(),
	})
	.openapi('JoinRecruitmentBody')

export const UpdateRoleBodySchema = z
	.object({
		mainRole: RoleSchema.optional(),
		subRole: RoleSchema.optional(),
	})
	.openapi('UpdateRoleBody')

// ========== Response Schemas ==========

export const ParticipantSchema = z
	.object({
		discordId: z.string(),
		mainRole: z.enum(LOL_ROLES).nullable(),
		subRole: z.enum(LOL_ROLES).nullable(),
	})
	.openapi('Participant')

export const JoinResponseSchema = z
	.object({
		participant: ParticipantSchema,
		isFull: z.boolean(),
		count: z.number(),
	})
	.openapi('JoinResponse')

export const LeaveResponseSchema = z
	.object({
		count: z.number(),
	})
	.openapi('LeaveResponse')

export const UpdateRoleResponseSchema = z
	.object({
		participant: ParticipantSchema,
	})
	.openapi('UpdateRoleResponse')
