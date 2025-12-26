import { sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { LOL_DIVISIONS, LOL_TIERS } from '@/constants'
import { currentTimestamp, timestamp } from './common'

export const users = sqliteTable('users', {
	discordId: text('discord_id').primaryKey(),
	createdAt: timestamp('created_at').notNull().default(currentTimestamp),
	updatedAt: timestamp('updated_at')
		.notNull()
		.default(currentTimestamp)
		.$onUpdate(() => currentTimestamp),
})

export const ranks = sqliteTable('ranks', {
	discordId: text('discord_id')
		.primaryKey()
		.references(() => users.discordId, {
			onDelete: 'cascade',
			onUpdate: 'cascade',
		}),
	tier: text('tier', { enum: LOL_TIERS }).notNull(),
	division: text('division', { enum: LOL_DIVISIONS }),
	createdAt: timestamp('created_at').notNull().default(currentTimestamp),
	updatedAt: timestamp('updated_at')
		.notNull()
		.default(currentTimestamp)
		.$onUpdate(() => currentTimestamp),
})
