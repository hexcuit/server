import { OpenAPIHono } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import v1 from '@/routes/v1'
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

app.get('/docs', Scalar({ url: '/docs.json' }))

app.route('/', v1)

export default app
