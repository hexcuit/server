import { z } from '@hono/zod-openapi'
import { createInsertSchema } from 'drizzle-zod'
import { lolRanks } from '@/db/schema'

// ========== Path Parameters ==========

export const RankPathParamsSchema = z
	.object({
		discordId: z.string().min(1),
	})
	.openapi('RankPathParams')

// ========== Request Schemas ==========

export const GetRanksQuerySchema = z
	.object({
		id: z.array(z.string()).or(z.string().transform((val) => [val])),
	})
	.openapi('GetRanksQuery')

// Exclude discordId as it comes from path params
export const LoLRankInsertSchema = createInsertSchema(lolRanks).omit({ discordId: true })

// ========== Response Schemas ==========

export const RankItemSchema = z
	.object({
		discordId: z.string(),
		tier: z.string(),
		division: z.string().nullable(),
	})
	.openapi('RankItem')

export const GetRanksResponseSchema = z
	.object({
		ranks: z.array(RankItemSchema),
	})
	.openapi('GetRanksResponse')

export const UpsertRankResponseSchema = z
	.object({
		rank: RankItemSchema,
	})
	.openapi('UpsertRankResponse')
