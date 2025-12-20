import { OpenAPIHono } from '@hono/zod-openapi'
import create from './create'
import remove from './remove'
import update from './update'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', create)
app.route('/', remove)
app.route('/', update)

export default app
