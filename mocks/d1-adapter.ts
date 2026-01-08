import Database, { type Database as DatabaseType } from 'better-sqlite3'

interface D1Result<T = unknown> {
	results?: T[]
	success: boolean
	meta: {
		changes: number
		last_row_id: number
		duration: number
	}
}

interface D1ExecResult {
	count: number
	duration: number
}

class D1PreparedStatementAdapter {
	private db: DatabaseType
	private query: string
	private params: unknown[] = []

	constructor(db: DatabaseType, query: string) {
		this.db = db
		this.query = query
	}

	bind(...values: unknown[]): D1PreparedStatementAdapter {
		this.params = values
		return this
	}

	async first<T = unknown>(colName?: string): Promise<T | null> {
		const stmt = this.db.prepare(this.query)
		const row = stmt.get(...this.params) as Record<string, unknown> | null
		if (!row) return null
		if (colName) return row[colName] as T
		return row as T
	}

	async all<T = unknown>(): Promise<D1Result<T>> {
		const start = performance.now()
		const stmt = this.db.prepare(this.query)
		const results = stmt.all(...this.params) as T[]
		return {
			results,
			success: true,
			meta: {
				changes: 0,
				last_row_id: 0,
				duration: performance.now() - start,
			},
		}
	}

	async run(): Promise<D1Result> {
		const start = performance.now()
		const stmt = this.db.prepare(this.query)
		const result = stmt.run(...this.params)
		return {
			success: true,
			meta: {
				changes: result.changes,
				last_row_id: Number(result.lastInsertRowid),
				duration: performance.now() - start,
			},
		}
	}

	async raw<T = unknown[]>(): Promise<T[]> {
		const stmt = this.db.prepare(this.query)
		return stmt.raw().all(...this.params) as T[]
	}
}

export class D1DatabaseAdapter {
	private db: DatabaseType

	constructor(db: DatabaseType) {
		this.db = db
	}

	prepare(query: string): D1PreparedStatementAdapter {
		return new D1PreparedStatementAdapter(this.db, query)
	}

	async batch<T = unknown>(statements: D1PreparedStatementAdapter[]): Promise<D1Result<T>[]> {
		this.db.exec('BEGIN TRANSACTION')
		try {
			const results: D1Result<T>[] = []
			for (const stmt of statements) {
				results.push((await stmt.run()) as D1Result<T>)
			}
			this.db.exec('COMMIT')
			return results
		} catch (error) {
			this.db.exec('ROLLBACK')
			throw error
		}
	}

	async exec(query: string): Promise<D1ExecResult> {
		const start = performance.now()
		// Use Bun's native exec() which properly handles multi-statement SQL
		// including semicolons inside strings, comments, and complex migrations
		this.db.exec(query)
		return {
			count: 0,
			duration: performance.now() - start,
		}
	}

	dump(): Promise<ArrayBuffer> {
		const buffer = this.db.serialize()
		return Promise.resolve(
			buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer,
		)
	}
}

export function createD1Database(): D1DatabaseAdapter {
	const db = new Database(':memory:')
	return new D1DatabaseAdapter(db)
}
