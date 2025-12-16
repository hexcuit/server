import { z } from '@hono/zod-openapi'
import { LOL_ROLES } from '@/constants'

// ========== Path Parameters ==========

export const RecruitmentPathParamsSchema = z
	.object({
		id: z.uuid(),
	})
	.openapi('RecruitmentPathParams')

// ========== Request Schemas ==========

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

// ========== Response Schemas ==========

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

export const DeleteRecruitmentResponseSchema = z
	.object({
		deleted: z.boolean(),
	})
	.openapi('DeleteRecruitmentResponse')
