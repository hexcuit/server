import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { createMiddleware } from 'hono/factory'
import type * as schema from '@/db/schema'
import { getDb } from '@/utils/db'

export type DbType = DrizzleD1Database<typeof schema>

export type DbVariables = {
	db: DbType
}

/**
 * DB接続を共通化するミドルウェア
 * c.var.db でDB接続にアクセス可能
 */
export const dbMiddleware = createMiddleware<{
	Bindings: Cloudflare.Env
	Variables: DbVariables
}>(async (c, next) => {
	c.set('db', getDb(c.env))
	await next()
})
