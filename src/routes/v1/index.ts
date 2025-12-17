import { OpenAPIHono } from '@hono/zod-openapi'
import { apiKeyMiddleware } from '@/middlewares/apiKeyMiddleware'
import { corsMiddleware } from '@/middlewares/corsMiddleware'
import { guildsRouter } from './guilds'
import { queuesRouter } from './queues'
import { ranksRouter } from './ranks'

export const v1Router = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
	.use(corsMiddleware)
	.use(apiKeyMiddleware)
	.route('/ranks', ranksRouter)
	.route('/queues', queuesRouter)
	.route('/guilds', guildsRouter)
