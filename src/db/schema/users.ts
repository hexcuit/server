import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { LOL_DIVISIONS, LOL_TIERS } from '@/constants'

import { currentTimestamp } from './common'

export const users = pgTable('users', {
	discordId: text('discord_id').primaryKey(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at')
		.notNull()
		.defaultNow()
		.$onUpdate(() => currentTimestamp),
})

export const ranks = pgTable('ranks', {
	discordId: text('discord_id')
		.primaryKey()
		.references(() => users.discordId, {
			onDelete: 'cascade',
			onUpdate: 'cascade',
		}),
	tier: text('tier', { enum: LOL_TIERS }).notNull(),
	division: text('division', { enum: LOL_DIVISIONS }),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at')
		.notNull()
		.defaultNow()
		.$onUpdate(() => currentTimestamp),
})
