import { OpenAPIHono } from '@hono/zod-openapi'
import { guildsRouter } from './guilds'
import { queuesRouter } from './queues'
import { ranksRouter } from './ranks'

export const v1Router = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
	.route('/ranks', ranksRouter)
	.route('/queues', queuesRouter)
	.route('/guilds', guildsRouter)
