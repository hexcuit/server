import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { Glob } from 'bun'

async function main() {
	// Find files exporting typedApp (exclude index.ts, test.ts, schemas.ts)
	const glob = new Glob('src/routes/**/*.ts')
	const allFiles = Array.from(glob.scanSync({ dot: false })).sort()
	const files = allFiles.filter(
		(file) => !file.endsWith('index.ts') && !file.endsWith('.test.ts') && !file.endsWith('schemas.ts'),
	)

	// Filter files that export typedApp
	const routeFiles: string[] = []
	const skippedFiles: string[] = []

	for (const file of files) {
		const content = readFileSync(file, 'utf-8')
		if (content.includes('export const typedApp')) {
			routeFiles.push(file)
		} else {
			skippedFiles.push(file)
		}
	}

	// Generate imports and chains
	const imports: string[] = []
	const chains: string[] = []

	console.log('\x1b[1m\x1b[32mRegistered endpoints:\x1b[0m')
	routeFiles.forEach((file, index) => {
		const relativePath = `./${path.relative('src', file).replace(/\\/g, '/').replace(/\.ts$/, '')}`
		const varName = `app${index}`
		imports.push(`import { typedApp as ${varName} } from '${relativePath}'`)
		chains.push(`.route('/', ${varName})`)
		console.log(`  \x1b[90m[${String(index + 1).padStart(2, '0')}]\x1b[0m \x1b[36m${relativePath}\x1b[0m`)
	})

	const clientContent = `// This file is auto-generated. Do not edit manually.
// Run "bun run generate:client" to regenerate.

import { OpenAPIHono } from '@hono/zod-openapi'
import { hc } from 'hono/client'
${imports.join('\n')}

const app = new OpenAPIHono()
	${chains.join('\n\t')}

export type AppType = typeof app

export const hcWithType = (...args: Parameters<typeof hc>): ReturnType<typeof hc<AppType>> => hc<AppType>(...args)
`

	writeFileSync('src/client.ts', clientContent)

	// Generate dist/client.js (minimal runtime code)
	mkdirSync('dist', { recursive: true })
	const distClientContent = `import { hc } from 'hono/client';
export const hcWithType = (...args) => hc(...args);
`
	writeFileSync('dist/client.js', distClientContent)

	// Warn about files missing typedApp export
	if (skippedFiles.length > 0) {
		console.log(`\n\x1b[1m\x1b[33mWarning: Missing typedApp export:\x1b[0m`)
		for (const file of skippedFiles) {
			const relativePath = `./${path.relative('src', file).replace(/\\/g, '/').replace(/\.ts$/, '')}`
			console.log(`  \x1b[33m⚠\x1b[0m \x1b[90m${relativePath}\x1b[0m`)
		}
	}

	console.log(`\n\x1b[32m✓ Generated src/client.ts with ${routeFiles.length} routes\x1b[0m`)
}

main()
