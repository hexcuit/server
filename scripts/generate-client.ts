import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { glob } from 'glob'

async function main() {
	// typedApp をエクスポートしているファイルを探す（index.ts, test.ts, schemas.ts を除く）
	const files = await glob('src/routes/**/!(*index|*test|*schemas).ts', {
		posix: true,
	})

	// typedApp をエクスポートしているファイルのみフィルタ
	const routeFiles = files.filter((file) => {
		const content = readFileSync(file, 'utf-8')
		return content.includes('export const typedApp')
	})

	// インポート文とチェーンを生成
	const imports: string[] = []
	const chains: string[] = []

	routeFiles.forEach((file, index) => {
		const relativePath = `./${path.relative('src', file).replace(/\\/g, '/').replace(/\.ts$/, '')}`
		const varName = `app${index}`
		imports.push(`import { typedApp as ${varName} } from '${relativePath}'`)
		chains.push(`.route('/', ${varName})`)
	})

	const clientContent = `// This file is auto-generated. Do not edit manually.
// Run "bun run generate:client" to regenerate.

import { OpenAPIHono } from '@hono/zod-openapi'
import { hc } from 'hono/client'
${imports.join('\n')}

const app = new OpenAPIHono()
${chains.join('\n\t')}

type AppType = typeof app

export const hcWithType = (...args: Parameters<typeof hc>): ReturnType<typeof hc<AppType>> =>
	hc<AppType>(...args)
`

	writeFileSync('src/client.ts', clientContent)

	// dist/client.js も生成（最小限のランタイムコード）
	const distClientContent = `import { hc } from 'hono/client';
export const hcWithType = (...args) => hc(...args);
`
	writeFileSync('dist/client.js', distClientContent)

	console.log(`Generated src/client.ts with ${routeFiles.length} routes`)
}

main()
