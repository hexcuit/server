import type { Config } from 'drizzle-kit'

import { readdirSync } from 'node:fs'

const fileNames = readdirSync('.wrangler/state/v3/d1/miniflare-D1DatabaseObject')

const fileName = fileNames.find((fileName) => {
	return fileName.endsWith('.sqlite')
})

if (fileName === undefined) {
	throw new Error('No sqlite file found')
}

/**
 * $ bun drizzle-kit studio --config drizzle.config.local.ts
 */
export default {
	dialect: 'sqlite',
	schema: './src/db/schema/index.ts',
	out: 'migrations',
	dbCredentials: {
		url: `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/${fileName}`,
	},
} satisfies Config
