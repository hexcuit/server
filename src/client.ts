// This file is auto-generated. Do not edit manually.
// Run "bun run generate:client" to regenerate.

import { OpenAPIHono } from '@hono/zod-openapi'
import { hc } from 'hono/client'
import { typedApp as app0 } from './routes/v1/guilds/matches/confirm'
import { typedApp as app1 } from './routes/v1/guilds/matches/create'
import { typedApp as app2 } from './routes/v1/guilds/matches/get'
import { typedApp as app3 } from './routes/v1/guilds/matches/remove'
import { typedApp as app4 } from './routes/v1/guilds/matches/vote'
import { typedApp as app5 } from './routes/v1/guilds/rankings/get'
import { typedApp as app6 } from './routes/v1/guilds/ratings/get'
import { typedApp as app7 } from './routes/v1/guilds/ratings/upsert'
import { typedApp as app8 } from './routes/v1/guilds/users/get'
import { typedApp as app9 } from './routes/v1/queues/create'
import { typedApp as app10 } from './routes/v1/queues/get'
import { typedApp as app11 } from './routes/v1/queues/players/create'
import { typedApp as app12 } from './routes/v1/queues/players/remove'
import { typedApp as app13 } from './routes/v1/queues/remove'
import { typedApp as app14 } from './routes/v1/ranks/get'
import { typedApp as app15 } from './routes/v1/ranks/upsert'

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

export type AppType = typeof app

export const hcWithType = (...args: Parameters<typeof hc>): ReturnType<typeof hc<AppType>> => hc<AppType>(...args)
