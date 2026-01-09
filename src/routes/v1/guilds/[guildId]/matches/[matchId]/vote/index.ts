import { OpenAPIHono } from '@hono/zod-openapi'

import post from './post'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', post)

export default app
