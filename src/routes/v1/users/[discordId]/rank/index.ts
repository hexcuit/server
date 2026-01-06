import { OpenAPIHono } from '@hono/zod-openapi'
import put from './put'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', put)

export default app
