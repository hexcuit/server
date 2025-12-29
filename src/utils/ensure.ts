import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { guilds, users } from '@/db/schema'

/**
 * Ensure guild exists (auto-create if not)
 */
export async function ensureGuild(db: DrizzleD1Database, guildId: string) {
	await db.insert(guilds).values({ guildId }).onConflictDoNothing()
}

/**
 * Ensure user exists (auto-create if not)
 */
export async function ensureUser(db: DrizzleD1Database, discordId: string) {
	await db.insert(users).values({ discordId }).onConflictDoNothing()
}
