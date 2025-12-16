import { OpenAPIHono } from '@hono/zod-openapi'
import { apiKeyMiddleware } from '@/middlewares/apiKeyMiddleware'
import { corsMiddleware } from '@/middlewares/corsMiddleware'
import { guildsRouter } from './guilds'
import { ranksRouter } from './ranks'
import { recruitmentsRouter } from './recruitments'

export const v1Router = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
	.use(corsMiddleware)
	.use(apiKeyMiddleware)
	.route('/ranks', ranksRouter)
	.route('/recruitments', recruitmentsRouter)
	.route('/guilds', guildsRouter)
