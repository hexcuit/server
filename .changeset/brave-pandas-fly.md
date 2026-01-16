---
'@hexcuit/server': minor
---

Migrate from Cloudflare D1 (SQLite) to PostgreSQL with Hyperdrive

- Replace D1 database with PostgreSQL via Cloudflare Hyperdrive
- Update all schema files from drizzle-orm/sqlite-core to drizzle-orm/pg-core
- Convert D1-specific APIs (.get(), .all(), .batch()) to standard drizzle patterns
- Use PGlite for in-memory test database instead of D1 adapter
- Update CI/CD workflows for SSH tunnel-based PostgreSQL migrations
- Remove d1_databases from wrangler.jsonc
