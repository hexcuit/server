import { OpenAPIHono } from '@hono/zod-openapi'
import { createRecruitmentRouter } from './create'
import { deleteRecruitmentRouter } from './delete'
import { getRecruitmentRouter } from './get'
import { participantsRouter } from './participants'

export const recruitmentsRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
	.route('/', createRecruitmentRouter)
	.route('/', getRecruitmentRouter)
	.route('/', deleteRecruitmentRouter)
	.route('/', participantsRouter)
