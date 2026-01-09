import { OpenAPIHono } from '@hono/zod-openapi'

import del from './delete'
import join from './join'
import leave from './leave'
import start from './start'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', del)
app.route('/', join)
app.route('/', leave)
app.route('/', start)

export default app
