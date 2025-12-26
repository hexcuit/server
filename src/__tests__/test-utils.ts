import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { drizzle } from 'drizzle-orm/d1'
import type { LOL_DIVISIONS, LOL_TIERS } from '@/constants'
import { guilds, guildUserStats, ranks, users } from '@/db/schema'
import { env } from './setup'

/**
 * Auth headers for API requests.
 */
export const authHeaders = { headers: { 'x-api-key': env.API_KEY } }

/**
 * Test context that holds unique IDs for each test run.
 * Each test should create its own context to avoid data collisions.
 */
export interface TestContext {
	/** Unique prefix for this test run */
	prefix: string
	/** Primary guild ID for testing */
	guildId: string
	/** Primary discord user ID for testing */
	discordId: string
	/** Secondary discord user ID for testing */
	discordId2: string
	/** Channel ID for testing */
	channelId: string
	/** Message ID for testing */
	messageId: string
	/** Generate a new unique match ID */
	generateMatchId: () => string
	/** Generate a new unique pending match ID */
	generatePendingMatchId: () => string
	/** Generate a new unique queue ID */
	generateQueueId: () => string
	/** Generate a new unique user ID */
	generateUserId: () => string
}

/**
 * Creates a new test context with unique IDs.
 * Call this in beforeEach to ensure test isolation.
 */
export function createTestContext(): TestContext {
	const prefix = crypto.randomUUID().slice(0, 8)

	return {
		prefix,
		guildId: `guild-${prefix}`,
		discordId: `user-${prefix}`,
		discordId2: `user2-${prefix}`,
		channelId: `channel-${prefix}`,
		messageId: `message-${prefix}`,
		generateMatchId: () => crypto.randomUUID(),
		generatePendingMatchId: () => crypto.randomUUID(),
		generateQueueId: () => crypto.randomUUID(),
		generateUserId: () => `user-${crypto.randomUUID().slice(0, 8)}`,
	}
}

/**
 * Sets up common test users in the database.
 * Call after createTestContext to seed basic test data.
 */
export async function setupTestUsers(
	db: DrizzleD1Database,
	ctx: TestContext,
	options?: {
		withRatings?: boolean
		withLolRank?: boolean
	},
): Promise<void> {
	// Create primary users and guild
	await db.insert(users).values([{ discordId: ctx.discordId }, { discordId: ctx.discordId2 }])
	await db.insert(guilds).values({ guildId: ctx.guildId })

	if (options?.withRatings) {
		await db.insert(guildUserStats).values({
			guildId: ctx.guildId,
			discordId: ctx.discordId,
			rating: 1500,
			wins: 0,
			losses: 0,
			placementGames: 0,
		})
	}

	if (options?.withLolRank) {
		await db.insert(ranks).values({
			discordId: ctx.discordId,
			tier: 'DIAMOND',
			division: 'III',
		})
	}
}

/**
 * Seeds a LoL rank for testing. Creates user if not exists.
 */
export async function seedLolRank(
	discordId: string,
	rank: { tier: (typeof LOL_TIERS)[number]; division?: (typeof LOL_DIVISIONS)[number] | null },
): Promise<void> {
	const db = drizzle(env.DB)
	await db.insert(users).values({ discordId }).onConflictDoNothing()
	await db.insert(ranks).values({
		discordId,
		tier: rank.tier,
		division: rank.division ?? null,
	})
}
