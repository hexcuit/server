import { relations, sql } from 'drizzle-orm'
import { sqliteTable, text } from 'drizzle-orm/sqlite-core'
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

export const userZodSchema = createInsertSchema(users)

export const lolRankZodSchema = createInsertSchema(lolRank)

export const recruitmentZodSchema = createInsertSchema(recruitments)

export const recruitmentParticipantZodSchema = createInsertSchema(recruitmentParticipants)
