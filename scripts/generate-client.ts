#!/usr/bin/env bun
/**
 * Client generator
 *
 * Generates typed Hono client from route files.
 * Scans for files exporting `typedApp` and creates src/client.ts
 *
 * Usage:
 *   bun scripts/generate-client.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { glob } from 'node:fs/promises'
import path from 'node:path'

// ANSI colors
const c = {
	reset: '\x1b[0m',
	bold: '\x1b[1m',
	dim: '\x1b[2m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	cyan: '\x1b[36m',
} as const

async function main() {
	console.log(`\n${c.bold}${c.cyan}🔧 Client Generator${c.reset}\n`)

	// Find files exporting typedApp (exclude index.ts, test.ts, schemas.ts)
	const allFiles = (await Array.fromAsync(glob('src/routes/**/*.ts'))).sort()
	const files = allFiles.filter(
		(file) =>
			!file.endsWith('index.ts') && !file.endsWith('.test.ts') && !file.endsWith('schemas.ts'),
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

	console.log(
		`${c.green}${c.bold}Registered endpoints${c.reset} ${c.dim}(${routeFiles.length} routes)${c.reset}`,
	)

	for (const [i, file] of routeFiles.entries()) {
		const relativePath = `./${path.relative('src', file).replace(/\\/g, '/').replace(/\.ts$/, '')}`
		const varName = `app${i}`
		imports.push(`import { typedApp as ${varName} } from '${relativePath}'`)
		chains.push(`.route('/', ${varName})`)

		const isLast = i === routeFiles.length - 1
		const prefix = isLast ? '└─' : '├─'
		const num = String(i + 1).padStart(2, '0')
		console.log(
			`${c.dim}   ${prefix} ${c.reset}${c.dim}[${num}]${c.reset} ${c.cyan}${relativePath}${c.reset}`,
		)
	}

	const clientContent = `// This file is auto-generated. Do not edit manually.
// Run "bun run generate:client" to regenerate.

import { OpenAPIHono } from '@hono/zod-openapi'
import { hc } from 'hono/client'
${imports.join('\n')}

const app = new OpenAPIHono()
	${chains.join('\n\t')}

export type AppType = typeof app

export const hcWithType = (...args: Parameters<typeof hc>): ReturnType<typeof hc<AppType>> =>
	hc<AppType>(...args)
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
		console.log()
		console.log(
			`${c.yellow}⚠  Missing typedApp export${c.reset} ${c.dim}(${skippedFiles.length} files)${c.reset}`,
		)

		for (const [i, file] of skippedFiles.entries()) {
			const relativePath = `./${path.relative('src', file).replace(/\\/g, '/').replace(/\.ts$/, '')}`
			const isLast = i === skippedFiles.length - 1
			const prefix = isLast ? '└─' : '├─'
			console.log(`${c.dim}   ${prefix} ${c.yellow}${relativePath}${c.reset}`)
		}
	}

	// Summary
	console.log()
	console.log(`${c.dim}─────────────────────────────────${c.reset}`)
	console.log(`${c.green}${c.bold}✅ Generated src/client.ts${c.reset}`)
	console.log(`${c.dim}   ${routeFiles.length} routes registered${c.reset}\n`)
}

main()
