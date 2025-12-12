import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@/db/schema'

/**
 * Drizzle ORM instance を取得するヘルパー関数
 * スキーマ情報を含む統一されたDB接続を提供する
 */
export const getDb = (env: { DB: D1Database }) => {
	return drizzle(env.DB, { schema })
}
