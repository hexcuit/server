#!/usr/bin/env bun
/**
 * Route path/filename checker/fixer
 *
 * - path: File location is source of truth → fixes createRoute.path
 * - method: createRoute.method is source of truth → renames file
 *
 * Usage:
 *   bun scripts/fix-route-paths.ts          # Check only (exits 1 on mismatch)
 *   bun scripts/fix-route-paths.ts --fix    # Auto-fix issues
 */

import { access, readdir, readFile, rename, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative } from 'node:path'

const ROUTES_DIR = join(import.meta.dirname, '../src/routes')
const FIX_MODE = process.argv.includes('--fix')
const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const
type HttpMethod = (typeof HTTP_METHODS)[number]

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
	expectedPath: string // Based on file location
	filenameMethod: string // Current filename (e.g., "get" from "get.ts")
	actualPath: string | null // From createRoute
	actualMethod: string | null // From createRoute
}

interface Issue {
	file: RouteFile
	pathMismatch: boolean
	methodMismatch: boolean
	fixApplied: boolean
	newFilePath?: string
	error?: string
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

function getFilenameMethod(filePath: string): string {
	return basename(filePath, '.ts')
}

async function parseRouteFile(filePath: string): Promise<RouteFile> {
	const content = await readFile(filePath, 'utf-8')
	const relativePath = relative(ROUTES_DIR, filePath)
	const expectedPath = filePathToRoutePath(filePath, ROUTES_DIR)
	const filenameMethod = getFilenameMethod(filePath)

	// Extract path from createRoute
	const pathMatch = content.match(/path:\s*['"]([^'"]+)['"]/i)
	const actualPath = pathMatch?.[1] ?? null

	// Extract method from createRoute
	const methodMatch = content.match(/method:\s*['"](\w+)['"]/i)
	const actualMethod = methodMatch?.[1]?.toLowerCase() ?? null

	return { filePath, relativePath, expectedPath, filenameMethod, actualPath, actualMethod }
}

function printTree(items: { relativePath: string }[], color: string) {
	for (const [i, item] of items.entries()) {
		const isLast = i === items.length - 1
		const prefix = isLast ? '└─' : '├─'
		const num = String(i + 1).padStart(2, '0')
		console.log(
			`${c.dim}   ${prefix} ${c.reset}${c.dim}[${num}]${c.reset} ${color}${item.relativePath}${c.reset}`,
		)
	}
}

interface FixResult {
	success: boolean
	newFilePath?: string
	error?: string
}

async function fixRouteFile(
	file: RouteFile,
	pathMismatch: boolean,
	methodMismatch: boolean,
): Promise<FixResult> {
	let currentFilePath = file.filePath
	let success = false

	// Fix path in createRoute content
	if (pathMismatch && file.actualPath) {
		const content = await readFile(currentFilePath, 'utf-8')
		const newContent = content.replace(/path:\s*['"]([^'"]+)['"]/i, `path: '${file.expectedPath}'`)
		if (content !== newContent) {
			await writeFile(currentFilePath, newContent, 'utf-8')
			success = true
		}
	}

	// Rename file based on createRoute.method
	if (methodMismatch && file.actualMethod) {
		if (!HTTP_METHODS.includes(file.actualMethod as HttpMethod)) {
			// Invalid method, can't rename
			return { success }
		}

		const dir = dirname(currentFilePath)
		const newFilePath = join(dir, `${file.actualMethod}.ts`)

		// Check if target file already exists to avoid data loss
		try {
			await access(newFilePath)
			// File exists - abort to prevent overwriting
			return {
				success: false,
				error: `Target file already exists: ${basename(newFilePath)}`,
			}
		} catch {
			// File doesn't exist - safe to rename
		}

		await rename(currentFilePath, newFilePath)
		currentFilePath = newFilePath
		success = true

		return { success, newFilePath }
	}

	return { success }
}

async function main() {
	console.log(`\n${c.bold}${c.cyan}🔍 Route Checker${c.reset}\n`)

	const filePaths = await findRouteFiles(ROUTES_DIR)
	const files = await Promise.all(filePaths.map(parseRouteFile))

	const issues: Issue[] = []
	const skipped: RouteFile[] = []
	const invalidMethod: RouteFile[] = []

	for (const file of files) {
		// Skip files without createRoute
		if (!file.actualPath && !file.actualMethod) {
			skipped.push(file)
			continue
		}

		// Check if filename is valid HTTP method
		const filenameIsValid = HTTP_METHODS.includes(file.filenameMethod as HttpMethod)
		const actualMethodIsValid =
			file.actualMethod && HTTP_METHODS.includes(file.actualMethod as HttpMethod)

		// Skip files with invalid filename and no valid actualMethod to fix to
		if (!filenameIsValid && !actualMethodIsValid) {
			invalidMethod.push(file)
			continue
		}

		const pathMismatch = file.actualPath !== null && file.actualPath !== file.expectedPath
		const methodMismatch = file.actualMethod !== null && file.actualMethod !== file.filenameMethod

		if (pathMismatch || methodMismatch) {
			let fixApplied = false
			let newFilePath: string | undefined

			let error: string | undefined
			if (FIX_MODE) {
				const result = await fixRouteFile(file, pathMismatch, methodMismatch)
				fixApplied = result.success
				newFilePath = result.newFilePath
				error = result.error
			}
			issues.push({ file, pathMismatch, methodMismatch, fixApplied, newFilePath, error })
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

	// Show invalid method files
	if (invalidMethod.length > 0) {
		console.log(
			`${c.yellow}⚠  Invalid ${invalidMethod.length} file(s)${c.reset} ${c.dim}(not a valid HTTP method)${c.reset}`,
		)
		printTree(invalidMethod, c.dim)
		console.log()
	}

	// Show issues
	if (issues.length === 0) {
		console.log(`${c.green}${c.bold}✅ All routes are consistent!${c.reset}`)
		console.log(`${c.dim}   Checked ${files.length} route files${c.reset}\n`)
		return
	}

	console.log(`${c.red}${c.bold}Found ${issues.length} mismatch(es)${c.reset}\n`)

	for (const { file, pathMismatch, methodMismatch, fixApplied, newFilePath, error } of issues) {
		console.log(`${c.red}●${c.reset} ${c.bold}${file.relativePath}${c.reset}`)

		if (pathMismatch) {
			console.log(
				`${c.dim}   ├─${c.reset} path:   ${c.yellow}${file.actualPath}${c.reset} → ${c.green}${file.expectedPath}${c.reset} ${c.dim}(fix content)${c.reset}`,
			)
		}
		if (methodMismatch) {
			console.log(
				`${c.dim}   ├─${c.reset} file:   ${c.yellow}${file.filenameMethod}.ts${c.reset} → ${c.green}${file.actualMethod}.ts${c.reset} ${c.dim}(rename)${c.reset}`,
			)
		}

		if (fixApplied) {
			if (newFilePath) {
				const newRelative = relative(ROUTES_DIR, newFilePath)
				console.log(`${c.dim}   └─${c.reset} ${c.green}✅ Fixed! → ${newRelative}${c.reset}`)
			} else {
				console.log(`${c.dim}   └─${c.reset} ${c.green}✅ Fixed!${c.reset}`)
			}
		} else if (FIX_MODE) {
			const errorMsg = error ? `: ${error}` : ''
			console.log(`${c.dim}   └─${c.reset} ${c.red}⚠ Could not fix${errorMsg}${c.reset}`)
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
