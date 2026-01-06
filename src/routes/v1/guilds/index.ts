import { OpenAPIHono } from '@hono/zod-openapi'
import create from './create'
import get from './get'
import matches from './matches'
import queues from './queues'
import settings from './settings'
import stats from './stats'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', create)
app.route('/', get)
app.route('/', matches)
app.route('/', queues)
app.route('/', settings)
app.route('/', stats)

export default app
