import { z } from '@hono/zod-openapi'
import { lolRankZodSchema } from '@/db/schema'

// ========== リクエストスキーマ ==========

export const RankSchema = lolRankZodSchema.openapi('LolRank')

export const GetRanksQuerySchema = z
	.object({
		discordIds: z.array(z.string()).or(z.string().transform((val) => [val])),
	})
	.openapi('GetRanksQuery')

// ========== レスポンススキーマ ==========

export const RankItemSchema = z
	.object({
		discordId: z.string(),
		tier: z.string(),
		division: z.string(),
	})
	.openapi('RankItem')

export const GetRanksResponseSchema = z
	.object({
		ranks: z.array(RankItemSchema),
	})
	.openapi('GetRanksResponse')

export const CreateRankResponseSchema = z
	.object({
		message: z.string(),
	})
	.openapi('CreateRankResponse')
