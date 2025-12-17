import { z } from '@hono/zod-openapi'
import { LOL_ROLES } from '@/constants'

// ========== Path Parameters ==========

export const PlayerPathParamsSchema = z
	.object({
		id: z.uuid(),
		discordId: z.string().min(1),
	})
	.openapi('PlayerPathParams')

// ========== Request Schemas ==========

export const RoleSchema = z.enum(LOL_ROLES)

export const JoinQueueBodySchema = z
	.object({
		discordId: z.string().min(1),
		mainRole: RoleSchema.optional(),
		subRole: RoleSchema.optional(),
	})
	.openapi('JoinQueueBody')

export const UpdateRoleBodySchema = z
	.object({
		mainRole: RoleSchema.optional(),
		subRole: RoleSchema.optional(),
	})
	.openapi('UpdateRoleBody')

// ========== Response Schemas ==========

export const PlayerSchema = z
	.object({
		discordId: z.string(),
		mainRole: z.enum(LOL_ROLES).nullable(),
		subRole: z.enum(LOL_ROLES).nullable(),
	})
	.openapi('Player')

export const JoinResponseSchema = z
	.object({
		player: PlayerSchema,
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
		player: PlayerSchema,
	})
	.openapi('UpdateRoleResponse')
