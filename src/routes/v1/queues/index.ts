import { OpenAPIHono } from '@hono/zod-openapi'
import { createQueueRouter } from './create'
import { deleteQueueRouter } from './delete'
import { getQueueRouter } from './get'
import { playersRouter } from './players'

export const queuesRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
	.route('/', createQueueRouter)
	.route('/', getQueueRouter)
	.route('/', deleteQueueRouter)
	.route('/', playersRouter)
