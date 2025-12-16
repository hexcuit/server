import { OpenAPIHono } from '@hono/zod-openapi'
import { createParticipantRouter } from './create'
import { deleteParticipantRouter } from './delete'
import { updateParticipantRouter } from './update'

export const participantsRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
	.route('/', createParticipantRouter)
	.route('/', deleteParticipantRouter)
	.route('/', updateParticipantRouter)
