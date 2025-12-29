import { OpenAPIHono } from '@hono/zod-openapi'
import create from './create'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', create)

export default app
