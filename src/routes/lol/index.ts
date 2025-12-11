import { Hono } from 'hono'
import { rankRouter } from '@/routes/lol/rank'

// LoL関連のルーター
export const lolRouter = new Hono<{ Bindings: Cloudflare.Env }>().route('/rank', rankRouter)
