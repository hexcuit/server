import { OpenAPIHono } from '@hono/zod-openapi'

import del from './delete'
import get from './get'
import image from './image'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', get)
app.route('/', del)
app.route('/', image)

export default app
