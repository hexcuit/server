import { Hono } from 'hono'
import { rankRouter } from '@/routes/rank'
import version from '../package.json'

const app = new Hono()
	.get('/', (c) => {
		return c.text(`Hexcuit Server is running! | v ${version.version}`)
	})
	.route('/rank', rankRouter)

export type AppType = typeof app

export default {
	port: 3001,
	fetch: app.fetch,
}
