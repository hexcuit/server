import { OpenAPIHono } from '@hono/zod-openapi'
import matches from './matches'
import queues from './queues'
import rankings from './rankings'
import stats from './stats'
import users from './users'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', matches)
app.route('/', queues)
app.route('/', rankings)
app.route('/', stats)
app.route('/', users)

export default app
