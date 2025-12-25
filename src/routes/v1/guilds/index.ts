import { OpenAPIHono } from '@hono/zod-openapi'
import matches from './matches'
import queues from './queues'
import rankings from './rankings'
import ratings from './ratings'
import stats from './stats'
import users from './users'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', ratings)
app.route('/', rankings)
app.route('/', matches)
app.route('/', users)
app.route('/', queues)
app.route('/', stats)

export default app
