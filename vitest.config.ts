/// <reference types="vitest" />

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	test: {
		globals: true,
		include: ['src/**/__tests__/**/*.test.ts'],
		setupFiles: ['./src/__tests__/setup.ts'],
		fileParallelism: false,
		sequence: {
			concurrent: false,
		},
		coverage: {
			include: ['src/**/*.ts'],
			exclude: ['src/**/__tests__/**', 'src/**/*.test.ts', 'src/client.ts'],
		},
	},
})
