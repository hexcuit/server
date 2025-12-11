import { Hono } from 'hono'
import { lolRouter } from '@/routes/lol'
import { recruitRouter } from '@/routes/recruit'
import version from '../package.json'

const app = new Hono()
	.get('/', (c) => {
		return c.text(`Hexcuit Server is running! | v ${version.version}`)
	})
	.route('/lol', lolRouter)
	.route('/recruit', recruitRouter)

export type AppType = typeof app

export default {
	port: 3001,
	fetch: app.fetch,
}
