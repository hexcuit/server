import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'

export const corsMiddleware = createMiddleware<{ Bindings: Cloudflare.Env }>(async (c, next) => {
	const corsOrigin = c.env.CORS_ORIGIN?.trim()

	// CORS設定がない場合は500エラーを返す（API Key設定エラーと同様の挙動）
	if (!corsOrigin) {
		console.error('CORS_ORIGIN is not set in environment variables')
		return c.json({ error: 'Server configuration error' }, 500)
	}

	const corsMiddleware = cors({
		origin: (origin) => {
			if (!origin) return null
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
