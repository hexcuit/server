import { OpenAPIHono } from '@hono/zod-openapi'
import del from './delete'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', del)

export default app
