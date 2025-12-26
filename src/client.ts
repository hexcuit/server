// This file is auto-generated. Do not edit manually.
// Run "bun run generate:client" to regenerate.

import { OpenAPIHono } from '@hono/zod-openapi'
import { hc } from 'hono/client'
import { typedApp as app0 } from './routes/v1/guilds/create'
import { typedApp as app1 } from './routes/v1/guilds/get'
import { typedApp as app2 } from './routes/v1/guilds/settings/get'
import { typedApp as app3 } from './routes/v1/guilds/settings/update'
import { typedApp as app4 } from './routes/v1/guilds/update'
import { typedApp as app5 } from './routes/v1/users/create'
import { typedApp as app6 } from './routes/v1/users/get'
import { typedApp as app7 } from './routes/v1/users/rank/upsert'

const app = new OpenAPIHono()
	.route('/', app0)
	.route('/', app1)
	.route('/', app2)
	.route('/', app3)
	.route('/', app4)
	.route('/', app5)
	.route('/', app6)
	.route('/', app7)

export type AppType = typeof app

export const hcWithType = (...args: Parameters<typeof hc>): ReturnType<typeof hc<AppType>> => hc<AppType>(...args)
