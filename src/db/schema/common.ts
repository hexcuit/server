import { sql } from 'drizzle-orm'

export const currentTimestamp = sql`now()`
