import { OpenAPIHono } from '@hono/zod-openapi'
import create from './create'
import deleteRoute from './delete'
import get from './get'
import players from './players'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', create)
app.route('/', get)
app.route('/', deleteRoute)
app.route('/', players)

export default app
