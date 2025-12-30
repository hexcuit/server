import { OpenAPIHono } from '@hono/zod-openapi'
import deleteStats from './delete'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', deleteStats)

export default app
