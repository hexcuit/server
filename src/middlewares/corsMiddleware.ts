import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'

export const corsMiddleware = createMiddleware<{ Bindings: Cloudflare.Env }>(async (c, next) => {
	const corsMiddleware = cors({
		origin: (origin) => {
			const allowedOrigins = c.env.CORS_ORIGIN.split(',').map((url) => url.trim()) || []
			return allowedOrigins.includes(origin || '') ? origin : null
		},
		allowHeaders: ['Origin', 'Content-Type', 'Authorization'],
		allowMethods: ['GET', 'OPTIONS', 'POST', 'PUT', 'DELETE'],
		credentials: true,
	})
	await corsMiddleware(c, next)
})
