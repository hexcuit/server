import { OpenAPIHono } from '@hono/zod-openapi'
import { confirmMatchRouter } from './confirm'
import { createMatchRouter } from './create'
import { deleteMatchRouter } from './delete'
import { getMatchRouter } from './get'
import { voteMatchRouter } from './vote'

export const matchesRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
	.route('/', createMatchRouter)
	.route('/', getMatchRouter)
	.route('/', deleteMatchRouter)
	.route('/', voteMatchRouter)
	.route('/', confirmMatchRouter)
