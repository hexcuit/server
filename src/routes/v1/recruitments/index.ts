import { OpenAPIHono } from '@hono/zod-openapi'
import { createRecruitmentRouter } from './create'
import { deleteRecruitmentRouter } from './delete'
import { getRecruitmentRouter } from './get'
import { joinRecruitmentRouter } from './join'
import { leaveRecruitmentRouter } from './leave'
import { updateRoleRouter } from './update-role'

export const recruitmentsRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
	.route('/', createRecruitmentRouter)
	.route('/', getRecruitmentRouter)
	.route('/', deleteRecruitmentRouter)
	.route('/', joinRecruitmentRouter)
	.route('/', leaveRecruitmentRouter)
	.route('/', updateRoleRouter)
