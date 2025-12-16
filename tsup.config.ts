import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/client.ts'],
	format: ['esm'],
	dts: false,
	clean: true,
	minify: true,
	external: ['hono'],
})
