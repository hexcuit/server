import { OpenAPIHono } from '@hono/zod-openapi'
import { apiKeyMiddleware } from '@/middlewares/apiKeyMiddleware'
import { corsMiddleware } from '@/middlewares/corsMiddleware'
import { createRankRouter } from './create'
import { getRanksRouter } from './get'

export const rankRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
	.use(corsMiddleware)
	.use(apiKeyMiddleware)
	.route('/', createRankRouter)
	.route('/', getRanksRouter)
