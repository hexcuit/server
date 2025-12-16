// Ensure @hono/zod-openapi extends Zod before any schemas are loaded
import '@hono/zod-openapi'

import { applyD1Migrations, env } from 'cloudflare:test'

// Apply D1 migrations before each test file runs
await applyD1Migrations(env.DB, env.MIGRATIONS)
