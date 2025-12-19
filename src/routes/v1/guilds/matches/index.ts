import { OpenAPIHono } from '@hono/zod-openapi'
import confirm from './confirm'
import create from './create'
import get from './get'
import remove from './remove'
import vote from './vote'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', create)
app.route('/', get)
app.route('/', remove)
app.route('/', vote)
app.route('/', confirm)

export default app
