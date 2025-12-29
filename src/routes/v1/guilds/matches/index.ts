import { OpenAPIHono } from '@hono/zod-openapi'
import confirm from './confirm'
import create from './create'
import get from './get'
import votes from './votes'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', create)
app.route('/', get)
app.route('/', confirm)
app.route('/', votes)

export default app
