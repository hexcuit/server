import { OpenAPIHono } from '@hono/zod-openapi'
import create from './create'
import remove from './remove'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', create)
app.route('/', remove)

export default app
