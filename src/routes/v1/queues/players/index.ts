import { OpenAPIHono } from '@hono/zod-openapi'
import { createPlayerRouter } from './create'
import { deletePlayerRouter } from './delete'
import { updatePlayerRouter } from './update'

export const playersRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
	.route('/', createPlayerRouter)
	.route('/', deletePlayerRouter)
	.route('/', updatePlayerRouter)
