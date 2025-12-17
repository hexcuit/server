import { OpenAPIHono } from '@hono/zod-openapi'
import { getRanksRouter } from './get'
import { upsertRankRouter } from './upsert'

export const ranksRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
	.route('/', getRanksRouter)
	.route('/', upsertRankRouter)
