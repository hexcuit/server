import { z } from '@hono/zod-openapi'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { guildQueuePlayers, guildQueues } from '@/db/schema'

// ========== Path Parameters ==========

export const QueuePathParamsSchema = z
	.object({
		id: z.uuid(),
		guildId: z.string(),
	})
	.openapi('QueuePathParams')

// ========== Request Schemas ==========

export const QueueInsertSchema = createInsertSchema(guildQueues, {
	capacity: z.number().int().positive(),
}).omit({
	id: true,
	guildId: true,
	status: true,
	createdAt: true,
	updatedAt: true,
})

// ========== Response Schemas ==========

export const QueueSelectSchema = createSelectSchema(guildQueues)

export const QueuePlayerSelectSchema = createSelectSchema(guildQueuePlayers)
