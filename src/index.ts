import { OpenAPIHono } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { HTTPException } from 'hono/http-exception'
import { apiKeyMiddleware } from '@/middlewares/apiKeyMiddleware'
import { corsMiddleware } from '@/middlewares/corsMiddleware'
import v1 from '@/routes/v1'
import version from '../package.json'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.doc('/docs.json', {
	openapi: '3.1.0',
	info: {
		version: version.version,
		title: 'Hexcuit API',
	},
	security: [{ apiKey: [] }],
})

app.openAPIRegistry.registerComponent('securitySchemes', 'apiKey', {
	type: 'apiKey',
	in: 'header',
	name: 'x-api-key',
	description: 'API Key for authentication',
})

app.get('/docs', Scalar({ url: '/docs.json' }))

app.use(corsMiddleware)
app.use(apiKeyMiddleware)
app.route('/', v1)

app.onError((err, c) => {
	if (err instanceof HTTPException) {
		return c.json({ message: err.message }, err.status)
	}
	return c.json({ message: 'Internal Server Error' }, 500)
})

export default app
