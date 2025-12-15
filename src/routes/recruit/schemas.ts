import { z } from '@hono/zod-openapi'
import { LOL_ROLES } from '@/constants'

// ========== リクエストスキーマ ==========

export const RoleSchema = z.enum(LOL_ROLES)

export const CreateRecruitmentSchema = z
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
	.openapi('CreateRecruitment')

export const JoinRecruitmentSchema = z
	.object({
		recruitmentId: z.uuid(),
		discordId: z.string(),
		mainRole: RoleSchema.optional(),
		subRole: RoleSchema.optional(),
	})
	.openapi('JoinRecruitment')

export const LeaveRecruitmentSchema = z
	.object({
		recruitmentId: z.uuid(),
		discordId: z.string(),
	})
	.openapi('LeaveRecruitment')

// ========== レスポンススキーマ ==========

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
		success: z.boolean(),
		recruitmentId: z.string(),
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
		success: z.boolean(),
		isFull: z.boolean(),
		count: z.number(),
		participants: z.array(ParticipantSchema),
	})
	.openapi('JoinResponse')

export const LeaveResponseSchema = z
	.object({
		success: z.boolean(),
		count: z.number(),
		participants: z.array(ParticipantSchema),
	})
	.openapi('LeaveResponse')

export const UpdateRoleResponseSchema = z
	.object({
		success: z.boolean(),
		participants: z.array(ParticipantSchema),
	})
	.openapi('UpdateRoleResponse')

export const SuccessResponseSchema = z
	.object({
		success: z.boolean(),
	})
	.openapi('DeleteRecruitmentResponse')
