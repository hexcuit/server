import { sql } from 'drizzle-orm'
import { customType } from 'drizzle-orm/sqlite-core'

export const timestamp = customType<{
	data: Date
	driverData: string
}>({
	dataType: () => 'text',

	toDriver: (value): string => value.toISOString(),

	fromDriver: (value): Date => new Date(value),
})

export const currentTimestamp = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`
