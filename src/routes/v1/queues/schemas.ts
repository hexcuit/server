import { z } from '@hono/zod-openapi'
import { LOL_ROLES, QUEUE_STATUSES, QUEUE_TYPES } from '@/constants'

// ========== Path Parameters ==========

export const QueuePathParamsSchema = z
	.object({
		id: z.uuid(),
	})
	.openapi('QueuePathParams')

// ========== Request Schemas ==========

export const CreateQueueBodySchema = z
	.object({
		id: z.uuid(),
		guildId: z.string(),
		channelId: z.string(),
		messageId: z.string(),
		creatorId: z.string(),
		type: z.enum(QUEUE_TYPES),
		anonymous: z.boolean(),
		capacity: z.number().int().positive(),
		startTime: z.string().optional(),
	})
	.openapi('CreateQueueBody')

// ========== Response Schemas ==========

export const QueueSchema = z
	.object({
		id: z.string(),
		guildId: z.string(),
		channelId: z.string(),
		messageId: z.string(),
		creatorId: z.string(),
		type: z.enum(QUEUE_TYPES),
		anonymous: z.boolean(),
		capacity: z.number(),
		startTime: z.string().nullable(),
		status: z.enum(QUEUE_STATUSES),
		createdAt: z.string(),
		updatedAt: z.string(),
	})
	.openapi('Queue')

export const CreateQueueResponseSchema = z
	.object({
		queue: z.object({
			id: z.string(),
		}),
	})
	.openapi('CreateQueueResponse')

export const GetQueueResponseSchema = z
	.object({
		queue: QueueSchema,
		players: z.array(
			z.object({
				id: z.string(),
				queueId: z.string(),
				discordId: z.string(),
				mainRole: z.enum(LOL_ROLES).nullable(),
				subRole: z.enum(LOL_ROLES).nullable(),
				joinedAt: z.string(),
			}),
		),
		count: z.number(),
	})
	.openapi('GetQueueResponse')

export const RemoveQueueResponseSchema = z
	.object({
		removed: z.boolean(),
	})
	.openapi('RemoveQueueResponse')
