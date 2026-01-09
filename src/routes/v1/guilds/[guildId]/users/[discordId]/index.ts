import { OpenAPIHono } from '@hono/zod-openapi'

import history from './history'
import stats from './stats'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', stats)
app.route('/', history)

export default app
