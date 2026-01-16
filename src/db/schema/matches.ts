import { index, integer, pgTable, primaryKey, text, timestamp, unique } from 'drizzle-orm/pg-core'

import {
	LOL_ROLES,
	LOL_TEAMS,
	MATCH_RESULTS,
	MATCH_STATUSES,
	PLAYER_RESULTS,
	VOTE_OPTIONS,
} from '@/constants'

import { guilds } from './guilds'
import { users } from './users'

export const guildMatches = pgTable(
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
		channelId: text('channel_id').notNull(),
		messageId: text('message_id').notNull(),
		status: text('status', { enum: MATCH_STATUSES }).notNull(),
		winningTeam: text('winning_team', { enum: MATCH_RESULTS }), // nullable: voting中はnull
		blueVotes: integer('blue_votes').notNull().default(0),
		redVotes: integer('red_votes').notNull().default(0),
		drawVotes: integer('draw_votes').notNull().default(0),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		confirmedAt: timestamp('confirmed_at'), // nullable: 確定日時
	},
	(table) => [
		index('guild_matches_guild_created_idx').on(table.guildId, table.createdAt),
		unique('guild_matches_message_id_unique').on(table.messageId),
	],
)

// 試合参加者（試合視点）
export const guildMatchPlayers = pgTable(
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
	},
	(table) => [
		primaryKey({ columns: [table.matchId, table.discordId] }),
		index('guild_match_players_discord_idx').on(table.discordId),
	],
)

// 投票詳細
export const guildMatchVotes = pgTable(
	'guild_match_votes',
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
		vote: text('vote', { enum: VOTE_OPTIONS }).notNull(),
	},
	(table) => [primaryKey({ columns: [table.matchId, table.discordId] })],
)

// ユーザー履歴（ユーザー視点）
export const guildUserMatchHistory = pgTable(
	'guild_user_match_history',
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
		matchId: text('match_id')
			.notNull()
			.references(() => guildMatches.id, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
		result: text('result', { enum: PLAYER_RESULTS }).notNull(),
		ratingChange: integer('rating_change').notNull(), // +15, -12 など
		ratingAfter: integer('rating_after').notNull(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(table) => [
		primaryKey({ columns: [table.guildId, table.discordId, table.matchId] }),
		index('guild_user_match_history_idx').on(table.guildId, table.discordId, table.createdAt),
	],
)
