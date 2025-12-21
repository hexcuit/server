import { relations, sql } from 'drizzle-orm'
import { integer, primaryKey, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'
import { createInsertSchema } from 'drizzle-zod'
import { LOL_DIVISIONS, LOL_ROLES, LOL_TEAMS, LOL_TIERS } from '@/constants'

export const users = sqliteTable('users', {
	discordId: text('discord_id').primaryKey(),
	createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`(current_timestamp)`)
		.$onUpdateFn(() => sql`(current_timestamp)`),
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

export const riotAccounts = sqliteTable('riot_accounts', {
	puuid: text('puuid').primaryKey(),
	discordId: text('discord_id')
		.notNull()
		.references(() => users.discordId, {
			onDelete: 'cascade',
			onUpdate: 'cascade',
		})
		.unique(),
	name: text('name').notNull(),
	tagLine: text('tagLine').notNull(),
	region: text('region').notNull(),
})

export const riotAccountsRelations = relations(riotAccounts, ({ one }) => ({
	user: one(users, {
		fields: [riotAccounts.discordId],
		references: [users.discordId],
	}),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
	riotAccount: one(riotAccounts),
	lolRanks: one(lolRanks),
	queues: many(queues),
	queuePlayers: many(queuePlayers),
	guildRatings: many(guildRatings),
	guildMatchParticipants: many(guildMatchParticipants),
}))

// キューチE�Eブル
export const queues = sqliteTable('queues', {
	id: text('id').primaryKey(),
	guildId: text('guild_id').notNull(),
	channelId: text('channel_id').notNull(),
	messageId: text('message_id').notNull(),
	creatorId: text('creator_id')
		.notNull()
		.references(() => users.discordId, {
			onDelete: 'cascade',
			onUpdate: 'cascade',
		}),
	type: text('type', { enum: ['normal', 'ranked'] })
		.notNull()
		.default('normal'),
	anonymous: integer('anonymous', { mode: 'boolean' }).notNull().default(false),
	capacity: integer('capacity').notNull().default(10),
	startTime: text('start_time'),
	status: text('status').notNull().default('open'),
	createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`(current_timestamp)`)
		.$onUpdateFn(() => sql`(current_timestamp)`),
})

// キュープレイヤーチE�Eブル
export const queuePlayers = sqliteTable(
	'queue_players',
	{
		id: text('id').primaryKey(),
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
		joinedAt: text('joined_at').notNull().default(sql`(current_timestamp)`),
	},
	(table) => [unique().on(table.queueId, table.discordId)],
)

export const queuesRelations = relations(queues, ({ one, many }) => ({
	creator: one(users, {
		fields: [queues.creatorId],
		references: [users.discordId],
	}),
	players: many(queuePlayers),
}))

export const queuePlayersRelations = relations(queuePlayers, ({ one }) => ({
	queue: one(queues, {
		fields: [queuePlayers.queueId],
		references: [queues.id],
	}),
	user: one(users, {
		fields: [queuePlayers.discordId],
		references: [users.discordId],
	}),
}))

// サーバ�E冁E��ーチE��ングチE�Eブル
export const guildRatings = sqliteTable(
	'guild_ratings',
	{
		guildId: text('guild_id').notNull(),
		discordId: text('discord_id')
			.notNull()
			.references(() => users.discordId, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		rating: integer('rating').notNull(),
		wins: integer('wins').notNull().default(0),
		losses: integer('losses').notNull().default(0),
		placementGames: integer('placement_games').notNull().default(0),
		createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
		updatedAt: text('updated_at')
			.notNull()
			.default(sql`(current_timestamp)`)
			.$onUpdateFn(() => sql`(current_timestamp)`),
	},
	(table) => [primaryKey({ columns: [table.guildId, table.discordId] })],
)

// 試合履歴チE�Eブル
export const guildMatches = sqliteTable('guild_matches', {
	id: text('id').primaryKey(),
	guildId: text('guild_id').notNull(),
	queueId: text('queue_id').references(() => queues.id, {
		onDelete: 'set null',
		onUpdate: 'cascade',
	}),
	winningTeam: text('winning_team', { enum: LOL_TEAMS }).notNull(),
	createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
})

// 試合参加老E��ーブル
export const guildMatchParticipants = sqliteTable('guild_match_participants', {
	id: text('id').primaryKey(),
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

export const guildRatingsRelations = relations(guildRatings, ({ one }) => ({
	user: one(users, {
		fields: [guildRatings.discordId],
		references: [users.discordId],
	}),
}))

export const guildMatchesRelations = relations(guildMatches, ({ one, many }) => ({
	queue: one(queues, {
		fields: [guildMatches.queueId],
		references: [queues.id],
	}),
	participants: many(guildMatchParticipants),
}))

export const guildMatchParticipantsRelations = relations(guildMatchParticipants, ({ one }) => ({
	match: one(guildMatches, {
		fields: [guildMatchParticipants.matchId],
		references: [guildMatches.id],
	}),
	user: one(users, {
		fields: [guildMatchParticipants.discordId],
		references: [users.discordId],
	}),
}))

// 投票中の試合テーブル
export const guildPendingMatches = sqliteTable('guild_pending_matches', {
	id: text('id').primaryKey(),
	guildId: text('guild_id').notNull(),
	channelId: text('channel_id').notNull(),
	messageId: text('message_id').notNull(),
	status: text('status', { enum: ['voting', 'confirmed', 'cancelled'] })
		.notNull()
		.default('voting'),
	teamAssignments: text('team_assignments').notNull(), // JSON: { discordId: { team, role, rating } }
	blueVotes: integer('blue_votes').notNull().default(0),
	redVotes: integer('red_votes').notNull().default(0),
	createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
})

// 試合投票チE�Eブル
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

export const guildPendingMatchesRelations = relations(guildPendingMatches, ({ many }) => ({
	votes: many(guildMatchVotes),
}))

export const guildMatchVotesRelations = relations(guildMatchVotes, ({ one }) => ({
	pendingMatch: one(guildPendingMatches, {
		fields: [guildMatchVotes.pendingMatchId],
		references: [guildPendingMatches.id],
	}),
	user: one(users, {
		fields: [guildMatchVotes.discordId],
		references: [users.discordId],
	}),
}))

export const userZodSchema = createInsertSchema(users)

export const queueZodSchema = createInsertSchema(queues)

export const queuePlayerZodSchema = createInsertSchema(queuePlayers)

export const guildRatingZodSchema = createInsertSchema(guildRatings)

export const guildMatchZodSchema = createInsertSchema(guildMatches)

export const guildMatchParticipantZodSchema = createInsertSchema(guildMatchParticipants)
