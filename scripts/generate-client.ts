#!/usr/bin/env bun
/**
 * Client generator
 *
 * Generates typed Hono client from route files.
 * Scans for files exporting `typedApp` and creates src/client.ts
 *
 * Usage:
 *   bun scripts/generate-client.ts          # Check only (exits 1 if out of date)
 *   bun scripts/generate-client.ts --fix    # Generate and write file
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { glob } from 'node:fs/promises'
import path from 'node:path'

const FIX_MODE = process.argv.includes('--fix')

// ANSI colors
const c = {
	reset: '\x1b[0m',
	bold: '\x1b[1m',
	dim: '\x1b[2m',
	red: '\x1b[31m',
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
	const allFiles = (await Array.fromAsync(glob('src/routes/**/*.ts')))
		.map((f) => f.replace(/\\/g, '/'))
		.sort()
	const files = allFiles.filter(
		(file) =>
			!file.endsWith('index.ts') && !file.endsWith('.test.ts') && !file.endsWith('schemas.ts'),
	)

	const routes: RouteFile[] = []
	const skipped: RouteFile[] = []

	for (const file of files) {
		const content = await readFile(file, 'utf-8')
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

	if (skipped.length > 0) {
		console.log()
		console.log(
			`${c.yellow}⚠  Missing typedApp export${c.reset} ${c.dim}(${skipped.length} files)${c.reset}`,
		)
		printTree(skipped, c.yellow)
	}

	const clientContent = generateClientContent(routes)
	const distContent = generateDistClient()

	// Read existing files
	let existingClient = ''
	let existingDist = ''
	try {
		existingClient = await readFile('src/client.ts', 'utf-8')
	} catch {
		// File doesn't exist
	}
	try {
		existingDist = await readFile('dist/client.js', 'utf-8')
	} catch {
		// File doesn't exist
	}

	const isUpToDate = existingClient === clientContent && existingDist === distContent

	console.log()
	console.log(`${c.dim}─────────────────────────────────${c.reset}`)

	if (isUpToDate) {
		console.log(`${c.green}${c.bold}✅ src/client.ts is up to date${c.reset}`)
		console.log(`${c.dim}   ${routes.length} routes registered${c.reset}\n`)
		return
	}

	if (FIX_MODE) {
		await writeFile('src/client.ts', clientContent)
		await mkdir('dist', { recursive: true })
		await writeFile('dist/client.js', distContent)
		console.log(`${c.green}${c.bold}✅ Generated src/client.ts${c.reset}`)
		console.log(`${c.dim}   ${routes.length} routes registered${c.reset}\n`)
	} else {
		console.log(`${c.red}${c.bold}❌ src/client.ts is out of date${c.reset}`)
		console.log(`${c.dim}   Run with --fix to regenerate${c.reset}\n`)
		process.exit(1)
	}
}

main().catch(console.error)
