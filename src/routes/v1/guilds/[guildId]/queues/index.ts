import { OpenAPIHono } from '@hono/zod-openapi'
import post from './post'
import queueId from './[queueId]'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', post)
app.route('/', queueId)

export default app
