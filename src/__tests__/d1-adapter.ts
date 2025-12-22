import { Database, type SQLQueryBindings } from 'bun:sqlite'

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
	private db: Database
	private query: string
	private params: SQLQueryBindings[] = []

	constructor(db: Database, query: string) {
		this.db = db
		this.query = query
	}

	bind(...values: SQLQueryBindings[]): D1PreparedStatementAdapter {
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
		return stmt.values(...this.params) as T[]
	}
}

export class D1DatabaseAdapter {
	private db: Database

	constructor(db: Database) {
		this.db = db
	}

	prepare(query: string): D1PreparedStatementAdapter {
		return new D1PreparedStatementAdapter(this.db, query)
	}

	async batch<T = unknown>(statements: D1PreparedStatementAdapter[]): Promise<D1Result<T>[]> {
		this.db.run('BEGIN TRANSACTION')
		try {
			const results: D1Result<T>[] = []
			for (const stmt of statements) {
				results.push((await stmt.run()) as D1Result<T>)
			}
			this.db.run('COMMIT')
			return results
		} catch (error) {
			this.db.run('ROLLBACK')
			throw error
		}
	}

	async exec(query: string): Promise<D1ExecResult> {
		const start = performance.now()
		const statements = query.split(';').filter((s) => s.trim())
		for (const stmt of statements) {
			if (stmt.trim()) {
				this.db.run(stmt)
			}
		}
		return {
			count: statements.length,
			duration: performance.now() - start,
		}
	}

	dump(): Promise<ArrayBuffer> {
		const buffer = this.db.serialize()
		return Promise.resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer)
	}
}

export function createD1Database(): D1DatabaseAdapter {
	const db = new Database(':memory:')
	return new D1DatabaseAdapter(db)
}
