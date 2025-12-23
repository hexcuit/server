import { z } from '@hono/zod-openapi'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { queuePlayers, queues } from '@/db/schema'

// ========== Path Parameters ==========

export const QueuePathParamsSchema = z
	.object({
		guildId: z.string(),
		id: z.uuid(),
	})
	.openapi('QueuePathParams')

// ========== Request Schemas ==========

export const QueueInsertSchema = createInsertSchema(queues, {
	capacity: z.number().int().positive(),
}).omit({
	id: true,
	guildId: true,
	status: true,
	createdAt: true,
	updatedAt: true,
})

// ========== Response Schemas ==========

export const QueueSelectSchema = createSelectSchema(queues)

export const QueuePlayerSelectSchema = createSelectSchema(queuePlayers)
