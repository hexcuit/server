import { OpenAPIHono } from '@hono/zod-openapi'
import stats from './stats'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', stats)

export default app
