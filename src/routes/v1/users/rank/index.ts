import { OpenAPIHono } from '@hono/zod-openapi'
import upsert from './upsert'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', upsert)

export default app
