import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'

export const corsMiddleware = createMiddleware<{ Bindings: Cloudflare.Env }>(async (c, next) => {
	const corsMiddleware = cors({
		origin: (origin) => {
			if (!origin) return null
			const corsOrigin = c.env.CORS_ORIGIN?.trim()
			if (!corsOrigin) return null
			const allowedOrigins = corsOrigin.split(',').map((url) => url.trim())
			return allowedOrigins.includes(origin) ? origin : null
		},
		allowHeaders: ['Origin', 'Content-Type', 'Authorization'],
		allowMethods: ['GET', 'OPTIONS', 'POST', 'PUT', 'DELETE'],
		credentials: true,
		maxAge: 86400,
	})
	await corsMiddleware(c, next)
})
