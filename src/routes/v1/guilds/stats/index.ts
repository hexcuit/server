import { OpenAPIHono } from '@hono/zod-openapi'
import get from './get'
import history from './history'
import rankings from './rankings'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', get)
app.route('/', rankings)
app.route('/', history)

export default app
