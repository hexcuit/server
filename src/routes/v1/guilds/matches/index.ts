import { OpenAPIHono } from '@hono/zod-openapi'
import get from './get'
import vote from './vote'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', get)
app.route('/', vote)

export default app
