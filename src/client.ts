// This file is auto-generated. Do not edit manually.
// Run "bun run generate:client" to regenerate.

import { OpenAPIHono } from '@hono/zod-openapi'
import { hc } from 'hono/client'
import { typedApp as app0 } from './routes/v1/guilds/create'
import { typedApp as app1 } from './routes/v1/guilds/get'
import { typedApp as app2 } from './routes/v1/guilds/matches/confirm'
import { typedApp as app3 } from './routes/v1/guilds/matches/create'
import { typedApp as app4 } from './routes/v1/guilds/matches/get'
import { typedApp as app5 } from './routes/v1/guilds/matches/votes/create'
import { typedApp as app6 } from './routes/v1/guilds/queues/create'
import { typedApp as app7 } from './routes/v1/guilds/queues/delete'
import { typedApp as app8 } from './routes/v1/guilds/queues/get'
import { typedApp as app9 } from './routes/v1/guilds/queues/players/create'
import { typedApp as app10 } from './routes/v1/guilds/queues/players/delete'
import { typedApp as app11 } from './routes/v1/guilds/rankings/get'
import { typedApp as app12 } from './routes/v1/guilds/settings/get'
import { typedApp as app13 } from './routes/v1/guilds/settings/update'
import { typedApp as app14 } from './routes/v1/guilds/stats/delete'
import { typedApp as app15 } from './routes/v1/guilds/update'
import { typedApp as app16 } from './routes/v1/guilds/users/history/get'
import { typedApp as app17 } from './routes/v1/guilds/users/stats/create'
import { typedApp as app18 } from './routes/v1/guilds/users/stats/delete'
import { typedApp as app19 } from './routes/v1/guilds/users/stats/get'
import { typedApp as app20 } from './routes/v1/guilds/users/stats/image'
import { typedApp as app21 } from './routes/v1/guilds/users/stats/update'
import { typedApp as app22 } from './routes/v1/users/create'
import { typedApp as app23 } from './routes/v1/users/get'
import { typedApp as app24 } from './routes/v1/users/rank/upsert'

const app = new OpenAPIHono()
	.route('/', app0)
	.route('/', app1)
	.route('/', app2)
	.route('/', app3)
	.route('/', app4)
	.route('/', app5)
	.route('/', app6)
	.route('/', app7)
	.route('/', app8)
	.route('/', app9)
	.route('/', app10)
	.route('/', app11)
	.route('/', app12)
	.route('/', app13)
	.route('/', app14)
	.route('/', app15)
	.route('/', app16)
	.route('/', app17)
	.route('/', app18)
	.route('/', app19)
	.route('/', app20)
	.route('/', app21)
	.route('/', app22)
	.route('/', app23)
	.route('/', app24)

export type AppType = typeof app

export const hcWithType = (...args: Parameters<typeof hc>): ReturnType<typeof hc<AppType>> => hc<AppType>(...args)
