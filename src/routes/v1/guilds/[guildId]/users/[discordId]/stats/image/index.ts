import { OpenAPIHono } from '@hono/zod-openapi'
import get from './get'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', get)

export default app
