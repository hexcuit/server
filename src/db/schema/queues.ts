import {
	boolean,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
	timestamp,
	unique,
} from 'drizzle-orm/pg-core'

import { QUEUE_STATUSES, QUEUE_TYPES, ROLE_PREFERENCES } from '@/constants'

import { currentTimestamp } from './common'
import { guilds } from './guilds'
import { users } from './users'

export const guildQueues = pgTable(
	'guild_queues',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		guildId: text('guild_id')
			.notNull()
			.references(() => guilds.guildId, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		channelId: text('channel_id').notNull(),
		messageId: text('message_id').notNull(),
		creatorId: text('creator_id').references(() => users.discordId, {
			onDelete: 'set null',
			onUpdate: 'cascade',
		}),
		type: text('type', { enum: QUEUE_TYPES }).notNull(),
		anonymous: boolean('anonymous').notNull(),
		capacity: integer('capacity').notNull(),
		status: text('status', { enum: QUEUE_STATUSES }).notNull(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at')
			.notNull()
			.defaultNow()
			.$onUpdate(() => currentTimestamp),
	},
	(table) => [
		index('guild_queues_guild_status_idx').on(table.guildId, table.status),
		unique('guild_queues_message_id_unique').on(table.messageId),
	],
)

export const guildQueuePlayers = pgTable(
	'guild_queue_players',
	{
		queueId: text('queue_id')
			.notNull()
			.references(() => guildQueues.id, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		discordId: text('discord_id')
			.notNull()
			.references(() => users.discordId, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		mainRole: text('main_role', { enum: ROLE_PREFERENCES }).notNull(),
		subRole: text('sub_role', { enum: ROLE_PREFERENCES }).notNull(),
		joinedAt: timestamp('joined_at').notNull().defaultNow(),
	},
	(table) => [primaryKey({ columns: [table.queueId, table.discordId] })],
)
