import { OpenAPIHono } from '@hono/zod-openapi'
import create from './create'
import deleteRoute from './delete'
import get from './get'
import update from './update'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', create)
app.route('/', get)
app.route('/', update)
app.route('/', deleteRoute)

export default app
