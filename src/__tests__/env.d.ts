import type { Env as WorkerEnv } from '../../worker-configuration'

declare module 'cloudflare:test' {
	interface ProvidedEnv extends WorkerEnv {
		DB: D1Database
		API_KEY: string
		MIGRATIONS: D1Migration[]
	}
}
