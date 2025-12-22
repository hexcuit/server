import { Database } from 'bun:sqlite'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
// Ensure @hono/zod-openapi extends Zod before any schemas are loaded
import '@hono/zod-openapi'
import { D1DatabaseAdapter } from './d1-adapter'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Create in-memory SQLite database
const db = new Database(':memory:')
const d1 = new D1DatabaseAdapter(db)

// Apply migrations
const drizzleDir = path.resolve(__dirname, '../../drizzle')
const migrationFiles = readdirSync(drizzleDir)
	.filter((f) => f.endsWith('.sql'))
	.sort()

for (const file of migrationFiles) {
	const sql = readFileSync(path.join(drizzleDir, file), 'utf-8')
	db.run(sql)
}

// Export test environment
export const env = {
	DB: d1 as unknown as D1Database,
	API_KEY: 'test-api-key',
}
