import { OpenAPIHono } from '@hono/zod-openapi'
import { getHistoryRouter } from './history'

export const usersRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().route('/', getHistoryRouter)
