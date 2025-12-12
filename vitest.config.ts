/// <reference types="vitest" />

import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vitest/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
	resolve: {
		alias: {
			'@': resolve(__dirname, './src'),
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
	},
})
