import { OpenAPIHono } from '@hono/zod-openapi'
import get from './get'
import rank from './rank'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', get)
app.route('/', rank)

export default app
