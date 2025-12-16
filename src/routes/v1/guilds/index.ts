import { OpenAPIHono } from '@hono/zod-openapi'
import { matchesRouter } from './matches'
import { rankingsRouter } from './rankings'
import { ratingsRouter } from './ratings'
import { usersRouter } from './users'

export const guildsRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
	.route('/:guildId/ratings', ratingsRouter)
	.route('/:guildId/rankings', rankingsRouter)
	.route('/:guildId/matches', matchesRouter)
	.route('/:guildId/users/:discordId/history', usersRouter)
