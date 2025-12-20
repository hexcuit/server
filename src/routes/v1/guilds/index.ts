import { OpenAPIHono } from '@hono/zod-openapi'
import matches from './matches'
import rankings from './rankings'
import ratings from './ratings'
import users from './users'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', ratings)
app.route('/', rankings)
app.route('/', matches)
app.route('/', users)

export default app
