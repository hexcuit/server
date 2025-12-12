import { OpenAPIHono } from '@hono/zod-openapi'
import { rankRouter } from '@/routes/lol/rank'

// LoL関連のルーター
export const lolRouter = new OpenAPIHono<{ Bindings: Cloudflare.Env }>().route('/rank', rankRouter)
