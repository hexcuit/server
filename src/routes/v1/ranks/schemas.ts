import { z } from '@hono/zod-openapi'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { lolRanks } from '@/db/schema'

// ========== Request Schemas ==========

export const LoLRankInsertSchema = createInsertSchema(lolRanks, {
	discordId: z.string().min(1),
})

// ========== Response Schemas ==========

export const LoLRankSelectSchema = createSelectSchema(lolRanks, {
	discordId: z.string().min(1),
})
