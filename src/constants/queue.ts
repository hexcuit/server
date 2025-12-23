// Queueステータス定義
export const QUEUE_STATUSES = ['open', 'full', 'closed'] as const
export type QueueStatus = (typeof QUEUE_STATUSES)[number]

// Queueタイプ定義
export const QUEUE_TYPES = ['normal', 'ranked'] as const
export type QueueType = (typeof QUEUE_TYPES)[number]
