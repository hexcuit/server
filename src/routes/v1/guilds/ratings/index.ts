import { OpenAPIHono } from '@hono/zod-openapi'
import { getRatingsRouter } from './get'
import { upsertRatingRouter } from './upsert'

export const ratingsRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
	.route('/', getRatingsRouter)
	.route('/', upsertRatingRouter)
