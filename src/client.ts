// This file is auto-generated. Do not edit manually.
// Run "bun run generate:client" to regenerate.

import { OpenAPIHono } from '@hono/zod-openapi'
import { hc } from 'hono/client'
import { typedApp as app0 } from './routes/v1/guilds/[guildId]/matches/[matchId]/vote/post'
import { typedApp as app1 } from './routes/v1/guilds/[guildId]/queues/[queueId]/delete'
import { typedApp as app2 } from './routes/v1/guilds/[guildId]/queues/[queueId]/join/post'
import { typedApp as app3 } from './routes/v1/guilds/[guildId]/queues/[queueId]/leave/post'
import { typedApp as app4 } from './routes/v1/guilds/[guildId]/queues/[queueId]/start/post'
import { typedApp as app5 } from './routes/v1/guilds/[guildId]/queues/post'
import { typedApp as app6 } from './routes/v1/guilds/[guildId]/rankings/get'
import { typedApp as app7 } from './routes/v1/guilds/[guildId]/stats/delete'
import { typedApp as app8 } from './routes/v1/guilds/[guildId]/users/[discordId]/history/get'
import { typedApp as app9 } from './routes/v1/guilds/[guildId]/users/[discordId]/stats/delete'
import { typedApp as app10 } from './routes/v1/guilds/[guildId]/users/[discordId]/stats/get'
import { typedApp as app11 } from './routes/v1/guilds/[guildId]/users/[discordId]/stats/image/get'
import { typedApp as app12 } from './routes/v1/users/[discordId]/get'
import { typedApp as app13 } from './routes/v1/users/[discordId]/rank/put'

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

export type AppType = typeof app

export const hcWithType = (...args: Parameters<typeof hc>): ReturnType<typeof hc<AppType>> =>
	hc<AppType>(...args)
