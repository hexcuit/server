import { PGlite } from '@electric-sql/pglite'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
// Ensure @hono/zod-openapi extends Zod before any schemas are loaded
import '@hono/zod-openapi'
import { setPgliteDb } from '@/db'

// Create PGlite instance (in-memory)
const client = new PGlite()
export const testDb = drizzle({ client })

// Register PGlite db for createDb('pglite://')
setPgliteDb(testDb)

// Apply migrations
const migrationsDir = join(import.meta.dirname, '..', 'drizzle')
const migrationDirs = readdirSync(migrationsDir, { withFileTypes: true })
	.filter((d) => d.isDirectory())
	.map((d) => d.name)
	.sort()

for (const dir of migrationDirs) {
	const migrationSql = readFileSync(join(migrationsDir, dir, 'migration.sql'), 'utf-8')
	// Split by statement-breakpoint and execute each statement
	const statements = migrationSql.split('--> statement-breakpoint').filter((s) => s.trim())
	for (const statement of statements) {
		await testDb.execute(sql.raw(statement))
	}
}

// Export test environment
export const env = {
	HYPERDRIVE: { connectionString: 'pglite://' },
	API_KEY: 'test-api-key',
	CORS_ORIGIN: 'http://localhost:3000',
}
