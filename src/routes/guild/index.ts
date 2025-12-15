import { OpenAPIHono } from '@hono/zod-openapi'
import { apiKeyMiddleware } from '@/middlewares/apiKeyMiddleware'
import { corsMiddleware } from '@/middlewares/corsMiddleware'
import { cancelMatchRouter } from './cancel-match'
import { confirmMatchRouter } from './confirm-match'
import { createMatchRouter } from './create-match'
import { createRatingRouter } from './create-rating'
import { getMatchRouter } from './get-match'
import { getMatchHistoryRouter } from './get-match-history'
import { getRankingRouter } from './get-ranking'
import { getRatingsRouter } from './get-ratings'
import { voteMatchRouter } from './vote-match'

export const guildRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()
	.use(corsMiddleware)
	.use(apiKeyMiddleware)
	.route('/', getRatingsRouter)
	.route('/', createRatingRouter)
	.route('/', getRankingRouter)
	.route('/', createMatchRouter)
	.route('/', getMatchRouter)
	.route('/', voteMatchRouter)
	.route('/', confirmMatchRouter)
	.route('/', cancelMatchRouter)
	.route('/', getMatchHistoryRouter)
