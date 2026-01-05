import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { drizzle } from 'drizzle-orm/d1'
import type { LOL_DIVISIONS, LOL_TIERS } from '@/constants'
import { INITIAL_RATING } from '@/constants/rating'
import { guilds, guildUserStats, ranks, users } from '@/db/schema'
import type { TestContext } from './context'
import { env } from './setup'

/**
 * Sets up common test users in the database.
 * Call after createTestContext to seed basic test data.
 */
export async function setupTestUsers(
	db: DrizzleD1Database,
	ctx: TestContext,
	options?: {
		withStats?: boolean
		withRank?: boolean
	},
): Promise<void> {
	// Create primary users and guild
	await db.insert(users).values([{ discordId: ctx.discordId }, { discordId: ctx.discordId2 }])
	await db.insert(guilds).values({ guildId: ctx.guildId })

	if (options?.withStats) {
		await db.insert(guildUserStats).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
			rating: INITIAL_RATING,
			peakRating: INITIAL_RATING,
		})
	}

	if (options?.withRank) {
		await db.insert(ranks).values({
			discordId: ctx.discordId,
			tier: 'DIAMOND',
			division: 'III',
		})
	}
}

/**
 * Seeds a user for testing.
 */
export async function seedUser(discordId: string): Promise<void> {
	const db = drizzle(env.DB)
	await db.insert(users).values({ discordId }).onConflictDoNothing()
}

/**
 * Seeds a rank for testing. Creates user if not exists.
 */
export async function seedRank(
	discordId: string,
	rank: { tier: (typeof LOL_TIERS)[number]; division?: (typeof LOL_DIVISIONS)[number] | null },
): Promise<void> {
	const db = drizzle(env.DB)
	await db.insert(users).values({ discordId }).onConflictDoNothing()
	await db
		.insert(ranks)
		.values({
			discordId,
			tier: rank.tier,
			division: rank.division ?? null,
		})
		.onConflictDoUpdate({
			target: ranks.discordId,
			set: { tier: rank.tier, division: rank.division ?? null },
		})
}
