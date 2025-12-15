import { swaggerUI } from '@hono/swagger-ui'
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { guildRouter } from '@/routes/guild'
import { lolRouter } from '@/routes/lol'
import { recruitRouter } from '@/routes/recruit'
import version from '../package.json'

// ヘルスチェック
const healthRoute = createRoute({
	method: 'get',
	path: '/',
	tags: ['Health'],
	summary: 'ヘルスチェック',
	description: 'サーバーの稼働状況を確認します',
	security: [],
	responses: {
		200: {
			description: 'サーバー稼働中',
			content: {
				'application/json': {
					schema: z.object({
						status: z.string(),
						version: z.string(),
					}),
				},
			},
		},
	},
})
export const app = new OpenAPIHono()
	.openapi(healthRoute, (c) => {
		return c.json({ status: 'ok', version: version.version })
	})
	.route('/lol', lolRouter)
	.route('/guild', guildRouter)
	.route('/recruit', recruitRouter)

// OpenAPI仕様ドキュメントを /doc で提供
app.doc('/doc', {
	openapi: '3.1.0',
	info: {
		version: version.version,
		title: 'Hexcuit API',
		description: 'League of Legends rank tracking and team balancing API',
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
app.get('/ui', swaggerUI({ url: '/doc' }))

export type AppType = typeof app

export default {
	port: 3001,
	fetch: app.fetch,
}
