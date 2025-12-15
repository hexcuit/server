import { createMiddleware } from 'hono/factory'

export const apiKeyMiddleware = createMiddleware<{ Bindings: Cloudflare.Env }>(async (c, next) => {
	if (!c.env.API_KEY) {
		console.error('API_KEY is not set in environment variables')
		return c.json({ error: 'Server configuration error' }, 500)
	}

	if (c.req.header('x-api-key') !== c.env.API_KEY) {
		return c.json({ error: 'Unauthorized' }, 401)
	}

	await next()
})
