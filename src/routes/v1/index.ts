import { OpenAPIHono } from '@hono/zod-openapi'
import { apiKeyMiddleware } from '@/middlewares/apiKeyMiddleware'
import { corsMiddleware } from '@/middlewares/corsMiddleware'
import guilds from './guilds'
import ranks from './ranks'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.use(corsMiddleware)
app.use(apiKeyMiddleware)
app.route('/', ranks)
app.route('/', guilds)

export default app
