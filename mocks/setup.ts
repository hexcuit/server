import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'
// Ensure @hono/zod-openapi extends Zod before any schemas are loaded
import '@hono/zod-openapi'
import { D1DatabaseAdapter } from './d1-adapter'

// Create in-memory SQLite database
const db = new Database(':memory:')
const d1 = new D1DatabaseAdapter(db)

// Read and apply migration SQL files
const migrationsDir = join(import.meta.dirname, '..', 'drizzle')
const migrationFiles = readdirSync(migrationsDir)
	.filter((f) => f.endsWith('.sql'))
	.sort()

for (const file of migrationFiles) {
	const sql = readFileSync(join(migrationsDir, file), 'utf-8')
	// Split by statement breakpoint and execute each statement
	const statements = sql.split('--> statement-breakpoint').map((s) => s.trim())
	for (const statement of statements) {
		if (statement) {
			db.exec(statement)
		}
	}
}

// Export test environment
export const env = {
	DB: d1 as unknown as D1Database,
	API_KEY: 'test-api-key',
	CORS_ORIGIN: 'http://localhost:3000',
}
