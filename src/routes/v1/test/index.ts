import { OpenAPIHono } from '@hono/zod-openapi'
import statsCard from './stats-card'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
app.route('/', statsCard)

export default app
