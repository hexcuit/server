import { OpenAPIHono } from '@hono/zod-openapi'
import create from './create'
import deleteQueue from './delete'
import get from './get'
import join from './join'
import leave from './leave'
import start from './start'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', create)
app.route('/', get)
app.route('/', deleteQueue)
app.route('/', join)
app.route('/', leave)
app.route('/', start)

export default app
