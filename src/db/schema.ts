import { relations, sql } from 'drizzle-orm'
import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createInsertSchema } from 'drizzle-zod'

export const users = sqliteTable('users', {
	discordId: text('discord_id').primaryKey(),
	createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`(current_timestamp)`)
		.$onUpdateFn(() => sql`(current_timestamp)`),
})

export const lolRank = sqliteTable('lol_rank', {
	discordId: text('discord_id')
		.primaryKey()
		.references(() => users.discordId, {
			onDelete: 'cascade',
			onUpdate: 'cascade',
		}),
	tier: text('tier').notNull(),
	division: text('division').notNull(),
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
	lolRanks: one(riotAccounts),
	recruitments: many(recruitments),
	recruitmentParticipants: many(recruitmentParticipants),
	guildRatings: many(guildRatings),
	guildMatchParticipants: many(guildMatchParticipants),
}))

// 募集テーブル
export const recruitments = sqliteTable('recruitments', {
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
	anonymous: text('anonymous').notNull().default('false'),
	capacity: text('capacity').notNull().default('10'),
	startTime: text('start_time'),
	status: text('status').notNull().default('open'),
	createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`(current_timestamp)`)
		.$onUpdateFn(() => sql`(current_timestamp)`),
})

// LoLロール定義
export const LOL_ROLES = ['top', 'jungle', 'mid', 'adc', 'support'] as const
export type LolRole = (typeof LOL_ROLES)[number]

// 募集参加者テーブル
export const recruitmentParticipants = sqliteTable('recruitment_participants', {
	id: text('id').primaryKey(),
	recruitmentId: text('recruitment_id')
		.notNull()
		.references(() => recruitments.id, {
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
})

export const recruitmentsRelations = relations(recruitments, ({ one, many }) => ({
	creator: one(users, {
		fields: [recruitments.creatorId],
		references: [users.discordId],
	}),
	participants: many(recruitmentParticipants),
}))

export const recruitmentParticipantsRelations = relations(recruitmentParticipants, ({ one }) => ({
	recruitment: one(recruitments, {
		fields: [recruitmentParticipants.recruitmentId],
		references: [recruitments.id],
	}),
	user: one(users, {
		fields: [recruitmentParticipants.discordId],
		references: [users.discordId],
	}),
}))

// サーバー内レーティングテーブル
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
		rating: integer('rating').notNull().default(1500),
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

// 試合履歴テーブル
export const guildMatches = sqliteTable('guild_matches', {
	id: text('id').primaryKey(),
	guildId: text('guild_id').notNull(),
	recruitmentId: text('recruitment_id').references(() => recruitments.id, {
		onDelete: 'set null',
		onUpdate: 'cascade',
	}),
	winningTeam: text('winning_team', { enum: ['blue', 'red'] }).notNull(),
	createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
})

// 試合参加者テーブル
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
	team: text('team', { enum: ['blue', 'red'] }).notNull(),
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
	recruitment: one(recruitments, {
		fields: [guildMatches.recruitmentId],
		references: [recruitments.id],
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

// 試合投票テーブル
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
		vote: text('vote', { enum: ['blue', 'red'] }).notNull(),
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

export const lolRankZodSchema = createInsertSchema(lolRank)

export const recruitmentZodSchema = createInsertSchema(recruitments)

export const recruitmentParticipantZodSchema = createInsertSchema(recruitmentParticipants)

export const guildRatingZodSchema = createInsertSchema(guildRatings)

export const guildMatchZodSchema = createInsertSchema(guildMatches)

export const guildMatchParticipantZodSchema = createInsertSchema(guildMatchParticipants)
