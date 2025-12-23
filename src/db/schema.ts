import { sql } from 'drizzle-orm'
import { customType, index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { LOL_DIVISIONS, LOL_ROLES, LOL_TEAMS, LOL_TIERS, QUEUE_STATUSES, QUEUE_TYPES } from '@/constants'

const isoDateTime = customType<{
	data: Date
	driverData: string
}>({
	dataType: () => 'text',

	toDriver: (value): string => value.toISOString(),

	fromDriver: (value): Date => new Date(value),
})

export const users = sqliteTable('users', {
	discordId: text('discord_id').primaryKey(),
	createdAt: isoDateTime('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
	updatedAt: isoDateTime('updated_at')
		.notNull()
		.default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
		.$onUpdate(() => sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})

export const lolRanks = sqliteTable('lol_ranks', {
	discordId: text('discord_id')
		.primaryKey()
		.references(() => users.discordId, {
			onDelete: 'cascade',
			onUpdate: 'cascade',
		}),
	tier: text('tier', { enum: LOL_TIERS }).notNull(),
	division: text('division', { enum: LOL_DIVISIONS }),
	createdAt: isoDateTime('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
	updatedAt: isoDateTime('updated_at')
		.notNull()
		.default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
		.$onUpdate(() => sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})

export const guilds = sqliteTable('guilds', {
	guildId: text('guild_id').primaryKey(),
	createdAt: isoDateTime('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
	updatedAt: isoDateTime('updated_at')
		.notNull()
		.default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
		.$onUpdate(() => sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})

export const guildQueues = sqliteTable(
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
		creatorId: text('creator_id')
			.notNull()
			.references(() => users.discordId, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		type: text('type', { enum: QUEUE_TYPES }).notNull(),
		anonymous: integer('anonymous', { mode: 'boolean' }).notNull(),
		capacity: integer('capacity').notNull(),
		status: text('status', { enum: QUEUE_STATUSES }).notNull(),
		createdAt: isoDateTime('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
		updatedAt: isoDateTime('updated_at')
			.notNull()
			.default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
			.$onUpdate(() => sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
	},
	(table) => [index('guild_queues_guild_status_idx').on(table.guildId, table.status)],
)

export const guildQueuePlayers = sqliteTable(
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
		mainRole: text('main_role', { enum: LOL_ROLES }),
		subRole: text('sub_role', { enum: LOL_ROLES }),
		joinedAt: isoDateTime('joined_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
	},
	(table) => [primaryKey({ columns: [table.queueId, table.discordId] })],
)

export const guildUserStats = sqliteTable(
	'guild_user_stats',
	{
		guildId: text('guild_id')
			.notNull()
			.references(() => guilds.guildId, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		discordId: text('discord_id')
			.notNull()
			.references(() => users.discordId, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		rating: integer('rating').notNull(),
		wins: integer('wins').notNull(),
		losses: integer('losses').notNull(),
		placementGames: integer('placement_games').notNull(),
		createdAt: isoDateTime('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
		updatedAt: isoDateTime('updated_at')
			.notNull()
			.default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
			.$onUpdate(() => sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
	},
	(table) => [
		primaryKey({ columns: [table.guildId, table.discordId] }),
		index('guild_user_stats_rating_idx').on(table.guildId, table.rating),
	],
)

export const guildMatches = sqliteTable(
	'guild_matches',
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
		queueId: text('queue_id').references(() => guildQueues.id, {
			onDelete: 'set null',
			onUpdate: 'cascade',
		}),
		winningTeam: text('winning_team', { enum: LOL_TEAMS }).notNull(),
		createdAt: isoDateTime('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
	},
	(table) => [index('guild_matches_guild_created_idx').on(table.guildId, table.createdAt)],
)

export const guildMatchPlayers = sqliteTable(
	'guild_match_players',
	{
		matchId: text('match_id')
			.notNull()
			.references(() => guildMatches.id, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		discordId: text('discord_id')
			.notNull()
			.references(() => users.discordId, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		team: text('team', { enum: LOL_TEAMS }).notNull(),
		role: text('role', { enum: LOL_ROLES }).notNull(),
		ratingBefore: integer('rating_before').notNull(),
		ratingAfter: integer('rating_after').notNull(),
	},
	(table) => [primaryKey({ columns: [table.matchId, table.discordId] })],
)

export const guildPendingMatches = sqliteTable('guild_pending_matches', {
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
	status: text('status', { enum: ['voting', 'confirmed'] }).notNull(),
	teamAssignments: text('team_assignments').notNull(), // JSON: { discordId: { team, role, rating } }
	blueVotes: integer('blue_votes').notNull(),
	redVotes: integer('red_votes').notNull(),
	createdAt: isoDateTime('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
	updatedAt: isoDateTime('updated_at')
		.notNull()
		.default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`)
		.$onUpdate(() => sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})

export const guildMatchVotes = sqliteTable(
	'guild_match_votes',
	{
		pendingMatchId: text('pending_match_id')
			.notNull()
			.references(() => guildPendingMatches.id, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		discordId: text('discord_id')
			.notNull()
			.references(() => users.discordId, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		vote: text('vote', { enum: LOL_TEAMS }).notNull(),
	},
	(table) => [primaryKey({ columns: [table.pendingMatchId, table.discordId] })],
)
