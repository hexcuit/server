import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'
import { guildRouter } from '@/routes/guild'
import { v1Router } from '@/routes/v1'
import version from '../package.json'

export const app = new OpenAPIHono()
	// v1 API
	.route('/v1', v1Router)
	// Legacy API (to be migrated)
	.route('/guild', guildRouter)

// OpenAPI仕様ドキュメントを /doc で提供
app.doc('/docs.json', {
	openapi: '3.1.0',
	info: {
		version: version.version,
		title: 'Hexcuit API',
	},
	security: [{ apiKey: [] }],
})

// セキュリティスキーマを登録
app.openAPIRegistry.registerComponent('securitySchemes', 'apiKey', {
	type: 'apiKey',
	in: 'header',
	name: 'x-api-key',
	description: 'API Key for authentication',
})

// Swagger UIを /ui で提供
app.get('/docs', swaggerUI({ url: '/docs.json' }))

export type AppType = typeof app

export default {
	port: 3001,
	fetch: app.fetch,
}
