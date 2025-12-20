import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/client.ts'],
	outDir: 'dist',
	format: ['esm'],
	dts: true,
	clean: true,
	minify: true,
	external: ['hono'],
})
