import { OpenAPIHono } from '@hono/zod-openapi'
import { guildsRouter } from './guilds'
import queues from './queues'
import ranks from './ranks'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', ranks)
app.route('/', queues)
app.route('/guilds', guildsRouter)

export default app
