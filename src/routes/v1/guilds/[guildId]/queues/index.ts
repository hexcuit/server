import { OpenAPIHono } from '@hono/zod-openapi'

import queueId from './[queueId]'
import post from './post'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', post)
app.route('/', queueId)

export default app
