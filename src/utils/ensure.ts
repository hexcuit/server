import type { Db } from '@/db'

import { guilds, users } from '@/db/schema'

/**
 * Ensure guild exists (auto-create if not)
 */
export async function ensureGuild(db: Db, guildId: string) {
	await db.insert(guilds).values({ guildId }).onConflictDoNothing()
}

/**
 * Ensure user exists (auto-create if not)
 */
export async function ensureUser(db: Db, discordId: string) {
	await db.insert(users).values({ discordId }).onConflictDoNothing()
}
