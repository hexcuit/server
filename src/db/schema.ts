import { integer, primaryKey, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'
import { LOL_DIVISIONS, LOL_ROLES, LOL_TEAMS, LOL_TIERS, QUEUE_STATUSES, QUEUE_TYPES } from '@/constants'

export const users = sqliteTable('users', {
	discordId: text('discord_id').primaryKey(),
	createdAt: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
		.$onUpdateFn(() => new Date().toISOString()),
})

export const guilds = sqliteTable('guilds', {
	guildId: text('guild_id').primaryKey(),
	createdAt: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
		.$onUpdateFn(() => new Date().toISOString()),
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
})

// Queue table
export const queues = sqliteTable('queues', {
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
	createdAt: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	updatedAt: text('updated_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString())
		.$onUpdateFn(() => new Date().toISOString()),
})

// Queue players table
export const queuePlayers = sqliteTable(
	'queue_players',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		queueId: text('queue_id')
			.notNull()
			.references(() => queues.id, {
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
		joinedAt: text('joined_at')
			.notNull()
			.$defaultFn(() => new Date().toISOString()),
	},
	(table) => [unique().on(table.queueId, table.discordId)],
)

// Guild ratings table
export const guildRatings = sqliteTable(
	'guild_ratings',
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
		createdAt: text('created_at')
			.notNull()
			.$defaultFn(() => new Date().toISOString()),
		updatedAt: text('updated_at')
			.notNull()
			.$defaultFn(() => new Date().toISOString())
			.$onUpdateFn(() => new Date().toISOString()),
	},
	(table) => [primaryKey({ columns: [table.guildId, table.discordId] })],
)

// Match history table
export const guildMatches = sqliteTable('guild_matches', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	guildId: text('guild_id')
		.notNull()
		.references(() => guilds.guildId, {
			onDelete: 'cascade',
			onUpdate: 'cascade',
		}),
	queueId: text('queue_id').references(() => queues.id, {
		onDelete: 'set null',
		onUpdate: 'cascade',
	}),
	winningTeam: text('winning_team', { enum: LOL_TEAMS }).notNull(),
	createdAt: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
})

// Match participants table
export const guildMatchParticipants = sqliteTable('guild_match_participants', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
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
})

// Pending matches table
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
	status: text('status', { enum: ['voting', 'confirmed', 'cancelled'] }).notNull(),
	teamAssignments: text('team_assignments').notNull(), // JSON: { discordId: { team, role, rating } }
	blueVotes: integer('blue_votes').notNull(),
	redVotes: integer('red_votes').notNull(),
	createdAt: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
})

// Match votes table
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
