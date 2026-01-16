import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'

import { apiKeyMiddleware } from '@/middlewares/apiKeyMiddleware'
import { corsMiddleware } from '@/middlewares/corsMiddleware'
import routes from '@/routes'

import version from '../package.json'

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

app.openAPIRegistry.registerComponent('securitySchemes', 'apiKey', {
	type: 'apiKey',
	in: 'header',
	name: 'x-api-key',
	description: 'API Key for authentication',
})

app.doc('/docs.json', {
	openapi: '3.1.0',
	info: {
		version: version.version,
		title: 'Hexcuit API',
	},
	security: [{ apiKey: [] }],
})

app.get('/docs', swaggerUI({ url: '/docs.json' }))

app.use(corsMiddleware)
app.use(apiKeyMiddleware)
app.route('/', routes)

export default app
