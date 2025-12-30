import { OpenAPIHono } from '@hono/zod-openapi'
import create from './create'
import get from './get'
import matches from './matches'
import queues from './queues'
import rankings from './rankings'
import settings from './settings'
import stats from './stats'
import update from './update'
import users from './users'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', create)
app.route('/', get)
app.route('/', update)
app.route('/', settings)
app.route('/', stats)
app.route('/', users)
app.route('/', rankings)
app.route('/', queues)
app.route('/', matches)

export default app
