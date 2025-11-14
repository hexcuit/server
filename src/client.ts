import { hc } from 'hono/client'
import type { AppType } from './index'

// クライアントの型をエクスポート
export type Client = ReturnType<typeof hc<AppType>>

// 型付きクライアントを作成するユーティリティ関数
export const hcWithType = (...args: Parameters<typeof hc>): Client => hc<AppType>(...args)
