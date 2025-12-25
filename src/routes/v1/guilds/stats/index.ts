import { OpenAPIHono } from '@hono/zod-openapi'
import reset from './reset'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', reset)

export default app
