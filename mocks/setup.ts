import Database from 'better-sqlite3'
// Ensure @hono/zod-openapi extends Zod before any schemas are loaded
import '@hono/zod-openapi'
import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api'
import * as schema from '@/db/schema'
import { D1DatabaseAdapter } from './d1-adapter'

// Create in-memory SQLite database
const db = new Database(':memory:')
const d1 = new D1DatabaseAdapter(db)

// Generate and apply schema from Drizzle schema definitions
const emptySnapshot = {
	id: '0000',
	prevId: '',
	version: '6',
	dialect: 'sqlite',
	tables: {},
	views: {},
	enums: {},
	_meta: { tables: {}, columns: {} },
} as const

const currentSnapshot = await generateSQLiteDrizzleJson(schema)
const statements = await generateSQLiteMigration(
	emptySnapshot,
	currentSnapshot as typeof emptySnapshot,
)

for (const statement of statements) {
	db.exec(statement)
}

// Export test environment
export const env = {
	DB: d1 as unknown as D1Database,
	API_KEY: 'test-api-key',
	CORS_ORIGIN: 'http://localhost:3000',
}
