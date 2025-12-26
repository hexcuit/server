import { z } from '@hono/zod-openapi'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { ranks } from '@/db/schema'

// ========== Request Schemas ==========

export const LoLRankInsertSchema = createInsertSchema(ranks, {
	discordId: z.string().min(1),
})

// ========== Response Schemas ==========

export const LoLRankSelectSchema = createSelectSchema(ranks, {
	discordId: z.string().min(1),
})

// ========== Params Schemas ==========

export const LoLRankParamsSchema = LoLRankInsertSchema.pick({ discordId: true })
