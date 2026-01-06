import { OpenAPIHono } from '@hono/zod-openapi'
import discordId from './[discordId]'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/', discordId)

export default app
