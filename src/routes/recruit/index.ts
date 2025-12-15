import { OpenAPIHono } from '@hono/zod-openapi'
import { apiKeyMiddleware } from '@/middlewares/apiKeyMiddleware'
import { corsMiddleware } from '@/middlewares/corsMiddleware'
import { createRecruitmentRouter } from './create'
import { deleteRecruitmentRouter } from './delete'
import { getRecruitmentRouter } from './get'
import { joinRecruitmentRouter } from './join'
import { leaveRecruitmentRouter } from './leave'
import { updateRoleRouter } from './update-role'

export const recruitRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
	.use(corsMiddleware)
	.use(apiKeyMiddleware)
	.route('/', createRecruitmentRouter)
	.route('/', getRecruitmentRouter)
	.route('/', joinRecruitmentRouter)
	.route('/', leaveRecruitmentRouter)
	.route('/', updateRoleRouter)
	.route('/', deleteRecruitmentRouter)
