import { OpenAPIHono } from '@hono/zod-openapi'
import { getRankingRouter } from './get'

export const rankingsRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().route('/', getRankingRouter)
