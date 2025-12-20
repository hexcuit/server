import { OpenAPIHono } from '@hono/zod-openapi'
import create from './create'
import get from './get'
import players from './players'
import remove from './remove'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', create)
app.route('/', get)
app.route('/', remove)
app.route('/', players)

export default app
