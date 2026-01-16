import type { PgAsyncDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'

import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js'

export type Db = PgAsyncDatabase<PgQueryResultHKT>

// For tests, store the PGlite db instance
let pgliteDb: Db | null = null

export function setPgliteDb(db: Db) {
	pgliteDb = db
}

export function createDb(connectionString: string): Db {
	if (connectionString === 'pglite://') {
		if (!pgliteDb) {
			throw new Error('PGlite db not initialized. Import @test/setup first.')
		}
		return pgliteDb
	}
	return drizzlePostgres(connectionString)
}
