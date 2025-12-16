import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Read D1 migrations from drizzle directory
const migrations = await readD1Migrations(path.resolve(__dirname, './drizzle'))

export default defineWorkersConfig({
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	test: {
		globals: true,
		include: ['src/**/__tests__/**/*.test.ts'],
		setupFiles: ['./src/__tests__/setup.ts'],
		poolOptions: {
			workers: {
				wrangler: { configPath: path.resolve(__dirname, './wrangler.jsonc') },
				miniflare: {
					d1Persist: false,
					bindings: {
						API_KEY: 'test-api-key',
						MIGRATIONS: migrations,
					},
				},
			},
		},
		coverage: {
			provider: 'istanbul',
			include: ['src/**/*.ts'],
			exclude: ['src/**/__tests__/**', 'src/**/*.test.ts', 'src/client.ts'],
		},
	},
})
