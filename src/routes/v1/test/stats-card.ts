import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import type { StatsCardData } from '@/utils/stats-card'
import { generateStatsCard } from '@/utils/stats-card'

const route = createRoute({
	method: 'get',
	path: '/v1/test/stats-card',
	tags: ['Test'],
	summary: 'Test stats card generation',
	description: 'Generate a stats card with dummy data for testing',
	responses: {
		200: {
			description: 'PNG image',
			content: {
				'image/png': {
					schema: { type: 'string', format: 'binary' },
				},
			},
		},
	},
})

const app = new OpenAPIHono<{ Bindings: Cloudflare.Env }>()

export const typedApp = app.openapi(route, async (c) => {
	try {
		console.log('Starting stats card generation...')

		// ダミーデータ（Hexcuit の実際の仕様に合わせた）
		const dummyData: StatsCardData = {
			displayName: 'Take2',
			avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png',

			// ランク情報
			rank: 'Gold II',
			rating: 1523,

			// 統計
			wins: 45,
			losses: 32,
			winRate: 58,

			// 順位
			position: 12,
			totalPlayers: 150,

			// プレースメント
			isPlacement: false,

			// 直近の試合履歴
			matchHistory: [
				{ won: true, change: 25 },
				{ won: true, change: 23 },
				{ won: false, change: -18 },
				{ won: true, change: 21 },
				{ won: false, change: -15 },
			],

			// レーティング履歴
			ratingHistory: [
				{ date: '12/01', rating: 1420 },
				{ date: '12/05', rating: 1445 },
				{ date: '12/08', rating: 1430 },
				{ date: '12/10', rating: 1480 },
				{ date: '12/12', rating: 1465 },
				{ date: '12/15', rating: 1490 },
				{ date: '12/18', rating: 1510 },
				{ date: '12/20', rating: 1495 },
				{ date: '12/22', rating: 1520 },
				{ date: '12/25', rating: 1523 },
			],
		}

		console.log('Generating stats card...')
		const pngData = await generateStatsCard(dummyData)
		console.log('Stats card generated, size:', pngData.length)

		return new Response(pngData, {
			headers: {
				'Content-Type': 'image/png',
				'Cache-Control': 'no-cache',
			},
		})
	} catch (error) {
		console.error('Error generating stats card:', error)
		return c.json({ error: String(error) }, 500)
	}
})

export default app
