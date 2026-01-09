#!/usr/bin/env bun
/**
 * Route path/method checker/fixer
 *
 * Ensures createRoute's path and method match the file location.
 * File path is the source of truth.
 *
 * Usage:
 *   bun scripts/fix-route-paths.ts          # Check only (exits 1 on mismatch)
 *   bun scripts/fix-route-paths.ts --fix    # Auto-fix issues
 */

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join, relative } from 'node:path'

const ROUTES_DIR = join(import.meta.dirname, '../src/routes')
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
	expectedPath: string
	expectedMethod: string
	actualPath: string | null
	actualMethod: string | null
}

interface Issue {
	file: RouteFile
	pathMismatch: boolean
	methodMismatch: boolean
	fixApplied: boolean
}

async function findRouteFiles(dir: string, basePath = ''): Promise<string[]> {
	const files: string[] = []
	const entries = await readdir(dir, { withFileTypes: true })

	for (const entry of entries) {
		const fullPath = join(dir, entry.name)
		const relativePath = join(basePath, entry.name)

		if (entry.isDirectory()) {
			files.push(...(await findRouteFiles(fullPath, relativePath)))
		} else if (
			entry.name.endsWith('.ts') &&
			!entry.name.endsWith('.test.ts') &&
			entry.name !== 'index.ts'
		) {
			files.push(fullPath)
		}
	}

	return files
}

function filePathToRoutePath(filePath: string, routesDir: string): string {
	const rel = relative(routesDir, filePath)
	let path = rel.replace(/\.ts$/, '')

	// Remove method filename
	const parts = path.split(/[/\\]/)
	parts.pop()

	// Convert [param] -> {param}
	const converted = parts.map((seg) =>
		seg.startsWith('[') && seg.endsWith(']') ? `{${seg.slice(1, -1)}}` : seg,
	)

	return `/${converted.join('/')}`
}

function filePathToMethod(filePath: string): string {
	return basename(filePath, '.ts')
}

async function parseRouteFile(filePath: string): Promise<RouteFile> {
	const content = await readFile(filePath, 'utf-8')
	const relativePath = relative(ROUTES_DIR, filePath)
	const expectedPath = filePathToRoutePath(filePath, ROUTES_DIR)
	const expectedMethod = filePathToMethod(filePath)

	// Extract path from createRoute
	const pathMatch = content.match(/path:\s*['"]([^'"]+)['"]/i)
	const actualPath = pathMatch?.[1] ?? null

	// Extract method from createRoute
	const methodMatch = content.match(/method:\s*['"](\w+)['"]/i)
	const actualMethod = methodMatch?.[1]?.toLowerCase() ?? null

	return { filePath, relativePath, expectedPath, expectedMethod, actualPath, actualMethod }
}

function printTree(items: { relativePath: string }[], color: string) {
	for (const [i, item] of items.entries()) {
		const isLast = i === items.length - 1
		const prefix = isLast ? '└─' : '├─'
		console.log(`${c.dim}   ${prefix}${c.reset} ${color}${item.relativePath}${c.reset}`)
	}
}

async function fixRouteFile(
	file: RouteFile,
	pathMismatch: boolean,
	methodMismatch: boolean,
): Promise<boolean> {
	let content = await readFile(file.filePath, 'utf-8')
	let changed = false

	if (pathMismatch && file.actualPath) {
		const newContent = content.replace(/path:\s*['"]([^'"]+)['"]/i, `path: '${file.expectedPath}'`)
		if (content !== newContent) {
			content = newContent
			changed = true
		}
	}

	if (methodMismatch && file.actualMethod) {
		const newContent = content.replace(
			/method:\s*['"](\w+)['"]/i,
			`method: '${file.expectedMethod}'`,
		)
		if (content !== newContent) {
			content = newContent
			changed = true
		}
	}

	if (changed) {
		await writeFile(file.filePath, content, 'utf-8')
	}

	return changed
}

async function main() {
	console.log(`\n${c.bold}${c.cyan}🔍 Route Checker${c.reset}\n`)

	const filePaths = await findRouteFiles(ROUTES_DIR)
	const files = await Promise.all(filePaths.map(parseRouteFile))

	const issues: Issue[] = []
	const skipped: RouteFile[] = []

	for (const file of files) {
		if (!file.actualPath && !file.actualMethod) {
			skipped.push(file)
			continue
		}

		const pathMismatch = file.actualPath !== null && file.actualPath !== file.expectedPath
		const methodMismatch = file.actualMethod !== null && file.actualMethod !== file.expectedMethod

		if (pathMismatch || methodMismatch) {
			let fixApplied = false
			if (FIX_MODE) {
				fixApplied = await fixRouteFile(file, pathMismatch, methodMismatch)
			}
			issues.push({ file, pathMismatch, methodMismatch, fixApplied })
		}
	}

	// Show skipped files
	if (skipped.length > 0) {
		console.log(
			`${c.yellow}⚠  Skipped ${skipped.length} file(s)${c.reset} ${c.dim}(no createRoute found)${c.reset}`,
		)
		printTree(skipped, c.dim)
		console.log()
	}

	// Show issues
	if (issues.length === 0) {
		console.log(`${c.green}${c.bold}✅ All routes are consistent!${c.reset}`)
		console.log(`${c.dim}   Checked ${files.length} route files${c.reset}\n`)
		return
	}

	console.log(`${c.red}${c.bold}Found ${issues.length} mismatch(es)${c.reset}\n`)

	for (const { file, pathMismatch, methodMismatch, fixApplied } of issues) {
		console.log(`${c.red}●${c.reset} ${c.bold}${file.relativePath}${c.reset}`)

		if (pathMismatch) {
			console.log(
				`${c.dim}   ├─${c.reset} path:   ${c.yellow}${file.actualPath}${c.reset} → ${c.green}${file.expectedPath}${c.reset}`,
			)
		}
		if (methodMismatch) {
			console.log(
				`${c.dim}   ├─${c.reset} method: ${c.yellow}${file.actualMethod}${c.reset} → ${c.green}${file.expectedMethod}${c.reset}`,
			)
		}

		if (fixApplied) {
			console.log(`${c.dim}   └─${c.reset} ${c.green}✅ Fixed!${c.reset}`)
		} else if (FIX_MODE) {
			console.log(`${c.dim}   └─${c.reset} ${c.red}⚠ Could not fix${c.reset}`)
		} else {
			console.log(`${c.dim}   └─${c.reset} ${c.dim}Run with --fix to auto-fix${c.reset}`)
		}
		console.log()
	}

	// Summary
	console.log(`${c.dim}─────────────────────────────────${c.reset}`)
	console.log(`${c.dim}Checked ${files.length} files${c.reset}`)

	if (FIX_MODE) {
		const fixed = issues.filter((i) => i.fixApplied).length
		console.log(`${c.green}Fixed ${fixed}/${issues.length} file(s)${c.reset}\n`)
	} else {
		console.log(`\n${c.cyan}Run with ${c.bold}--fix${c.reset}${c.cyan} to auto-fix${c.reset}\n`)
		process.exit(1)
	}
}

main().catch(console.error)
