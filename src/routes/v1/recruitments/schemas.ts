import { z } from '@hono/zod-openapi'
import { LOL_ROLES } from '@/constants'

// ========== Path Parameters ==========

export const RecruitmentPathParamsSchema = z
	.object({
		id: z.uuid(),
	})
	.openapi('RecruitmentPathParams')

export const ParticipantPathParamsSchema = z
	.object({
		id: z.uuid(),
		discordId: z.string().min(1),
	})
	.openapi('ParticipantPathParams')

// ========== Request Schemas ==========

export const RoleSchema = z.enum(LOL_ROLES)

export const CreateRecruitmentBodySchema = z
	.object({
		id: z.uuid(),
		guildId: z.string(),
		channelId: z.string(),
		messageId: z.string(),
		creatorId: z.string(),
		type: z.enum(['normal', 'ranked']).default('normal'),
		anonymous: z.boolean(),
		startTime: z.string().optional(),
	})
	.openapi('CreateRecruitmentBody')

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

export const RecruitmentSchema = z
	.object({
		id: z.string(),
		guildId: z.string(),
		channelId: z.string(),
		messageId: z.string(),
		creatorId: z.string(),
		type: z.enum(['normal', 'ranked']),
		anonymous: z.boolean(),
		capacity: z.number(),
		startTime: z.string().nullable(),
		status: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
	})
	.openapi('Recruitment')

export const CreateRecruitmentResponseSchema = z
	.object({
		recruitment: z.object({
			id: z.string(),
		}),
	})
	.openapi('CreateRecruitmentResponse')

export const GetRecruitmentResponseSchema = z
	.object({
		recruitment: RecruitmentSchema,
		participants: z.array(
			z.object({
				id: z.string(),
				recruitmentId: z.string(),
				discordId: z.string(),
				mainRole: z.enum(LOL_ROLES).nullable(),
				subRole: z.enum(LOL_ROLES).nullable(),
				joinedAt: z.string(),
			}),
		),
		count: z.number(),
	})
	.openapi('GetRecruitmentResponse')

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

export const DeleteRecruitmentResponseSchema = z
	.object({
		deleted: z.boolean(),
	})
	.openapi('DeleteRecruitmentResponse')
