import { OpenAPIHono } from '@hono/zod-openapi'
import get from './get'
import upsert from './upsert'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', get)
app.route('/', upsert)

export default app
