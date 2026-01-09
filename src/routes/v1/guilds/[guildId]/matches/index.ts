import { OpenAPIHono } from '@hono/zod-openapi'

import matchId from './[matchId]'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', matchId)

export default app
