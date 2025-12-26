import { OpenAPIHono } from '@hono/zod-openapi'
import get from './get'
import update from './update'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', get)
app.route('/', update)

export default app
