import { relations, sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
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

export const lolRanks = sqliteTable('lol_ranks', {
	id: text('id').primaryKey(),
	puuid: text('puuid').references(() => riotAccounts.puuid, {
		onDelete: 'cascade',
		onUpdate: 'cascade',
	}),
	queueType: text('queue_type').notNull(),
	tier: text('tier').notNull(),
	rank: text('rank').notNull(),
	leaguePoints: integer('leaguePoints').notNull(),
	wins: integer('wins').notNull(),
	losses: integer('losses').notNull(),
	lastUpdated: text('last_updated')
		.notNull()
		.default(sql`(current_timestamp)`)
		.$onUpdateFn(() => sql`(current_timestamp)`),
})

export const lolRanksRelations = relations(lolRanks, ({ one }) => ({
	riotAccount: one(riotAccounts, {
		fields: [lolRanks.puuid],
		references: [riotAccounts.puuid],
	}),
}))

export const riotAccountsRelations = relations(riotAccounts, ({ one, many }) => ({
	user: one(users, {
		fields: [riotAccounts.discordId],
		references: [users.discordId],
	}),
	lolRanks: many(lolRanks),
}))

export const usersRelations = relations(users, ({ one }) => ({
	riotAccount: one(riotAccounts),
	lolRanks: one(riotAccounts),
}))

export const userZodSchema = createInsertSchema(users)

export const lolRankZodSchema = createInsertSchema(lolRank)
