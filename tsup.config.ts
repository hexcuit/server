import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src/client.ts'],
	outDir: 'dist',
	format: ['esm'],
	dts: { only: true },
	clean: true,
	external: ['hono'],
})
