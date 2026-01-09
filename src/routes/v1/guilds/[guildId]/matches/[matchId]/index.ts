import { OpenAPIHono } from '@hono/zod-openapi'

import vote from './vote'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', vote)

export default app
