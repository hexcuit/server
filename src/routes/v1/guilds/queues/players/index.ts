import { OpenAPIHono } from '@hono/zod-openapi'
import create from './create'
import deleteRoute from './delete'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', create)
app.route('/', deleteRoute)

export default app
