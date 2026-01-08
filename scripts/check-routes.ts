#!/usr/bin/env bun
/**
 * Route consistency checker
 *
 * Verifies that:
 * - File path matches the route path in createRoute
 * - Filename matches the HTTP method
 * - No duplicate routes exist
 *
 * Usage:
 *   bun scripts/check-routes.ts          # Check only
 *   bun scripts/check-routes.ts --fix    # Auto-fix issues
 */

import { mkdir, readdir, readFile, rename, rmdir } from 'node:fs/promises'
import { basename, dirname, join, relative } from 'node:path'

const ROUTES_DIR = join(import.meta.dirname, '../src/routes/v1')
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
	magenta: '\x1b[35m',
} as const

interface RouteInfo {
	filePath: string
	method: string | null
	routePath: string | null
}

interface ValidRouteInfo {
	filePath: string
	method: string
	routePath: string
}

interface FileIssue {
	filePath: string
	methodMismatch: { expected: string; actual: string } | null
	pathMismatch: { expected: string; actual: string } | null
	correctPath: string
	isDuplicate: boolean
}

interface DuplicateGroup {
	routeKey: string // "METHOD /path"
	files: string[]
}

async function findRouteFiles(dir: string): Promise<string[]> {
	const files: string[] = []

	const entries = await readdir(dir, { withFileTypes: true })

	for (const entry of entries) {
		const fullPath = join(dir, entry.name)

		if (entry.isDirectory()) {
			files.push(...(await findRouteFiles(fullPath)))
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

async function parseRouteFile(filePath: string): Promise<RouteInfo> {
	const content = await readFile(filePath, 'utf-8')

	// Extract method from createRoute
	const methodMatch = content.match(/method:\s*['"](\w+)['"]/i)
	const method = methodMatch?.[1] ? methodMatch[1].toLowerCase() : null

	// Extract path from createRoute
	const pathMatch = content.match(/path:\s*['"]([^'"]+)['"]/i)
	const routePath = pathMatch?.[1] ? pathMatch[1] : null

	return { filePath, method, routePath }
}

function filePathToRoutePath(filePath: string, routesDir: string): string {
	// Get relative path from routes dir
	const rel = relative(routesDir, filePath)

	// Remove .ts extension
	let path = rel.replace(/\.ts$/, '')

	// Convert directory structure to route path
	// [param] -> {param}
	path = path.replace(/\[(\w+)\]/g, '{$1}')

	// Remove filename (method) from path
	const parts = path.split(/[/\\]/)
	parts.pop() // Remove method file

	// Build route path
	const routePath = `/v1/${parts.join('/')}`

	return routePath
}

function routePathToFilePath(routePath: string, method: string, routesDir: string): string {
	// Remove /v1/ prefix
	let path = routePath.replace(/^\/v1\/?/, '')

	// Convert {param} -> [param]
	path = path.replace(/\{(\w+)\}/g, '[$1]')

	// Add method filename
	const filePath = join(routesDir, path, `${method}.ts`)

	return filePath
}

interface CheckResult {
	issues: FileIssue[]
	duplicates: DuplicateGroup[]
	totalFiles: number
	skippedFiles: string[]
}

async function checkRoutes(): Promise<CheckResult> {
	const issues: FileIssue[] = []
	const files = await findRouteFiles(ROUTES_DIR)
	const skippedFiles: string[] = []

	// Track routes to detect duplicates
	const routeMap = new Map<string, string[]>() // "METHOD /path" -> [filePaths]

	// First pass: collect all routes
	const validRoutes: ValidRouteInfo[] = []
	for (const filePath of files) {
		const info = await parseRouteFile(filePath)

		if (!info.method || !info.routePath) {
			skippedFiles.push(relative(ROUTES_DIR, filePath))
			continue
		}

		const validInfo: ValidRouteInfo = { filePath, method: info.method, routePath: info.routePath }
		validRoutes.push(validInfo)

		const routeKey = `${info.method.toUpperCase()} ${info.routePath}`
		const existing = routeMap.get(routeKey) ?? []
		existing.push(filePath)
		routeMap.set(routeKey, existing)
	}

	// Find duplicates
	const duplicates: DuplicateGroup[] = []
	const duplicateFiles = new Set<string>()
	for (const [routeKey, files] of routeMap) {
		if (files.length > 1) {
			duplicates.push({ routeKey, files })
			for (const f of files) {
				duplicateFiles.add(f)
			}
		}
	}

	// Second pass: check for issues
	for (const route of validRoutes) {
		const fileName = basename(route.filePath, '.ts')

		let methodMismatch: FileIssue['methodMismatch'] = null
		let pathMismatch: FileIssue['pathMismatch'] = null

		// Check method matches filename
		if (fileName !== route.method) {
			methodMismatch = {
				expected: route.method,
				actual: fileName,
			}
		}

		// Check path matches file location
		const expectedPath = filePathToRoutePath(route.filePath, ROUTES_DIR)
		const normalizedRoutePath = route.routePath.replace(/\/+$/, '')
		const normalizedExpected = expectedPath.replace(/\/+$/, '')

		if (normalizedRoutePath !== normalizedExpected) {
			pathMismatch = {
				expected: route.routePath,
				actual: expectedPath,
			}
		}

		if (methodMismatch || pathMismatch) {
			// Calculate the correct path based on createRoute
			const correctPath = routePathToFilePath(route.routePath, route.method, ROUTES_DIR)
			issues.push({
				filePath: route.filePath,
				methodMismatch,
				pathMismatch,
				correctPath,
				isDuplicate: duplicateFiles.has(route.filePath),
			})
		}
	}

	return { issues, duplicates, totalFiles: files.length, skippedFiles }
}

async function fixIssue(issue: FileIssue): Promise<boolean> {
	try {
		// Create directory if needed
		await mkdir(dirname(issue.correctPath), { recursive: true })

		// Move file to correct location
		await rename(issue.filePath, issue.correctPath)

		// Clean up empty directories
		let dir = dirname(issue.filePath)
		while (dir !== ROUTES_DIR && dir.startsWith(ROUTES_DIR)) {
			try {
				await rmdir(dir)
				dir = dirname(dir)
			} catch {
				break
			}
		}

		return true
	} catch (error) {
		console.error(`${c.red}Failed to fix: ${error}${c.reset}`)
		return false
	}
}

async function main() {
	console.log(`\n${c.bold}${c.cyan}🔍 Route Consistency Checker${c.reset}\n`)

	const { issues, duplicates, totalFiles, skippedFiles } = await checkRoutes()

	// Show skipped files if any
	if (skippedFiles.length > 0) {
		console.log(
			`${c.yellow}⚠  Skipped ${skippedFiles.length} file(s)${c.reset} ${c.dim}(no createRoute found)${c.reset}`,
		)
		for (const [i, file] of skippedFiles.entries()) {
			const isLast = i === skippedFiles.length - 1
			const prefix = isLast ? '└─' : '├─'
			console.log(`${c.dim}   ${prefix} ${file}${c.reset}`)
		}
		console.log()
	}

	let hasErrors = false

	// Report duplicates first
	if (duplicates.length > 0) {
		hasErrors = true
		console.log(`${c.red}${c.bold}⚠  Found ${duplicates.length} duplicate route(s)${c.reset}\n`)

		for (const dup of duplicates) {
			console.log(`${c.red}●${c.reset} ${c.bold}${dup.routeKey}${c.reset}`)
			for (const [i, file] of dup.files.entries()) {
				const isLast = i === dup.files.length - 1
				const prefix = isLast ? '└─' : '├─'
				console.log(
					`${c.dim}   ${prefix}${c.reset} ${c.yellow}${relative(ROUTES_DIR, file)}${c.reset}`,
				)
			}
			console.log()
		}

		console.log(`${c.red}⛔ Duplicates must be resolved manually before fixing.${c.reset}\n`)
	}

	if (issues.length === 0 && duplicates.length === 0) {
		console.log(`${c.green}${c.bold}✅ All routes are consistent!${c.reset}`)
		console.log(`${c.dim}   Checked ${totalFiles} route files${c.reset}\n`)
		process.exit(0)
	}

	if (issues.length > 0) {
		hasErrors = true
		console.log(`${c.red}${c.bold}Found ${issues.length} file(s) with issues${c.reset}\n`)

		for (const issue of issues) {
			const relPath = relative(ROUTES_DIR, issue.filePath)
			const duplicateTag = issue.isDuplicate ? ` ${c.magenta}(DUPLICATE)${c.reset}` : ''
			console.log(`${c.red}●${c.reset} ${c.bold}${relPath}${c.reset}${duplicateTag}`)

			const details: string[] = []

			if (issue.methodMismatch) {
				details.push(
					`Method: filename is ${c.yellow}"${issue.methodMismatch.actual}"${c.reset}, should be ${c.green}"${issue.methodMismatch.expected}"${c.reset}`,
				)
			}

			if (issue.pathMismatch) {
				details.push(
					`Path: file suggests ${c.yellow}"${issue.pathMismatch.actual}"${c.reset}, route is ${c.green}"${issue.pathMismatch.expected}"${c.reset}`,
				)
			}

			const correctRelPath = relative(ROUTES_DIR, issue.correctPath)

			if (FIX_MODE && !issue.isDuplicate && duplicates.length === 0) {
				details.push(`${c.cyan}→ Moving to ${correctRelPath}${c.reset}`)
			} else if (issue.isDuplicate || duplicates.length > 0) {
				details.push(`${c.red}⛔ Cannot fix: resolve duplicate(s) first${c.reset}`)
			} else {
				details.push(`${c.dim}💡 Should be: ${correctRelPath}${c.reset}`)
			}

			for (const [i, detail] of details.entries()) {
				const isLast = i === details.length - 1
				const prefix = isLast ? '└─' : '├─'
				console.log(`${c.dim}   ${prefix}${c.reset} ${detail}`)
			}

			if (FIX_MODE && !issue.isDuplicate && duplicates.length === 0) {
				const success = await fixIssue(issue)
				if (success) {
					console.log(`${c.dim}   └─${c.reset} ${c.green}✅ Fixed!${c.reset}`)
				}
			}

			console.log()
		}
	}

	// Summary
	console.log(`${c.dim}─────────────────────────────────${c.reset}`)
	console.log(`${c.dim}Scanned ${totalFiles} files${c.reset}`)

	if (!FIX_MODE && hasErrors) {
		console.log(
			`\n${c.cyan}Run with ${c.bold}--fix${c.reset}${c.cyan} to auto-fix issues${c.reset}`,
		)
		if (duplicates.length > 0) {
			console.log(`${c.dim}(after resolving duplicates)${c.reset}`)
		}
		console.log()
		process.exit(1)
	}

	if (duplicates.length > 0) {
		console.log()
		process.exit(1)
	}

	if (FIX_MODE && issues.length > 0) {
		console.log(`\n${c.green}${c.bold}Done!${c.reset}\n`)
	}
}

main().catch(console.error)
