import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { INITIAL_RATING, K_FACTOR_NORMAL, K_FACTOR_PLACEMENT, PLACEMENT_GAMES } from '@/constants/rating'
import { currentTimestamp, timestamp } from './common'
import { users } from './users'

const GUILD_PLANS = ['free', 'premium'] as const

export const guilds = sqliteTable('guilds', {
	guildId: text('guild_id').primaryKey(),
	plan: text('plan', { enum: GUILD_PLANS }).notNull().default('free'),
	planExpiresAt: timestamp('plan_expires_at'), // nullable: 無期限/無料はnull
	createdAt: timestamp('created_at').notNull().default(currentTimestamp),
	updatedAt: timestamp('updated_at')
		.notNull()
		.default(currentTimestamp)
		.$onUpdate(() => currentTimestamp),
})

export const guildSettings = sqliteTable('guild_settings', {
	guildId: text('guild_id')
		.primaryKey()
		.references(() => guilds.guildId, {
			onDelete: 'cascade',
			onUpdate: 'cascade',
		}),
	initialRating: integer('initial_rating').notNull().default(INITIAL_RATING),
	kFactor: integer('k_factor').notNull().default(K_FACTOR_NORMAL),
	kFactorPlacement: integer('k_factor_placement').notNull().default(K_FACTOR_PLACEMENT),
	placementGamesRequired: integer('placement_games_required').notNull().default(PLACEMENT_GAMES),
	updatedAt: timestamp('updated_at')
		.notNull()
		.default(currentTimestamp)
		.$onUpdate(() => currentTimestamp),
})

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
		wins: integer('wins').notNull().default(0),
		losses: integer('losses').notNull().default(0),
		placementGames: integer('placement_games').notNull().default(0),
		peakRating: integer('peak_rating').notNull(), // 最高レート（初期値はratingと同じ）
		currentStreak: integer('current_streak').notNull().default(0), // +で連勝、-で連敗
		lastPlayedAt: timestamp('last_played_at'), // nullable: 未プレイ時はnull
		createdAt: timestamp('created_at').notNull().default(currentTimestamp),
		updatedAt: timestamp('updated_at')
			.notNull()
			.default(currentTimestamp)
			.$onUpdate(() => currentTimestamp),
	},
	(table) => [
		primaryKey({ columns: [table.guildId, table.discordId] }),
		index('guild_user_stats_rating_idx').on(table.guildId, table.rating),
	],
)
