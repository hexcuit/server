import { OpenAPIHono } from '@hono/zod-openapi'

import guildId from './[guildId]'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', guildId)

export default app
