import { OpenAPIHono } from '@hono/zod-openapi'
import matches from './matches'
import { rankingsRouter } from './rankings'
import { ratingsRouter } from './ratings'
import users from './users'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.route('/:guildId/ratings', ratingsRouter)
app.route('/:guildId/rankings', rankingsRouter)
app.route('/', matches)
app.route('/', users)

export default app
