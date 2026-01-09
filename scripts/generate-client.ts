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

interface RouteFile {
	filePath: string
	relativePath: string
}

const toRelativePath = (file: string) =>
	`./${path.relative('src', file).replace(/\\/g, '/').replace(/\.ts$/, '')}`

async function findRouteFiles(): Promise<{ routes: RouteFile[]; skipped: RouteFile[] }> {
	const allFiles = (await Array.fromAsync(glob('src/routes/**/*.ts'))).sort()
	const files = allFiles.filter(
		(file) =>
			!file.endsWith('index.ts') && !file.endsWith('.test.ts') && !file.endsWith('schemas.ts'),
	)

	const routes: RouteFile[] = []
	const skipped: RouteFile[] = []

	for (const file of files) {
		const content = readFileSync(file, 'utf-8')
		const routeFile = { filePath: file, relativePath: toRelativePath(file) }

		if (content.includes('export const typedApp')) {
			routes.push(routeFile)
		} else {
			skipped.push(routeFile)
		}
	}

	return { routes, skipped }
}

function generateClientContent(routes: RouteFile[]): string {
	const imports = routes
		.map((r, i) => `import { typedApp as app${i} } from '${r.relativePath}'`)
		.join('\n')

	const chains = routes.map((_, i) => `.route('/', app${i})`).join('\n\t')

	return `// This file is auto-generated. Do not edit manually.
// Run "bun run generate:client" to regenerate.

import { OpenAPIHono } from '@hono/zod-openapi'
import { hc } from 'hono/client'

${imports}

const app = new OpenAPIHono()
	${chains}

export type AppType = typeof app

export const hcWithType = (...args: Parameters<typeof hc>): ReturnType<typeof hc<AppType>> =>
	hc<AppType>(...args)
`
}

function generateDistClient(): string {
	return `import { hc } from 'hono/client';
export const hcWithType = (...args) => hc(...args);
`
}

function printTree(items: RouteFile[], color: string) {
	for (const [i, item] of items.entries()) {
		const isLast = i === items.length - 1
		const prefix = isLast ? '└─' : '├─'
		const num = String(i + 1).padStart(2, '0')
		console.log(
			`${c.dim}   ${prefix} ${c.reset}${c.dim}[${num}]${c.reset} ${color}${item.relativePath}${c.reset}`,
		)
	}
}

async function main() {
	console.log(`\n${c.bold}${c.cyan}🔧 Client Generator${c.reset}\n`)

	const { routes, skipped } = await findRouteFiles()

	console.log(
		`${c.green}${c.bold}Registered endpoints${c.reset} ${c.dim}(${routes.length} routes)${c.reset}`,
	)
	printTree(routes, c.cyan)

	writeFileSync('src/client.ts', generateClientContent(routes))

	mkdirSync('dist', { recursive: true })
	writeFileSync('dist/client.js', generateDistClient())

	if (skipped.length > 0) {
		console.log()
		console.log(
			`${c.yellow}⚠  Missing typedApp export${c.reset} ${c.dim}(${skipped.length} files)${c.reset}`,
		)
		printTree(skipped, c.yellow)
	}

	console.log()
	console.log(`${c.dim}─────────────────────────────────${c.reset}`)
	console.log(`${c.green}${c.bold}✅ Generated src/client.ts${c.reset}`)
	console.log(`${c.dim}   ${routes.length} routes registered${c.reset}\n`)
}

main()
