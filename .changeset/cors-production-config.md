---
"@hexcuit/server": patch
---

Improve CORS configuration for production environment

- Add early return for empty origin to prevent null origin bypass
- Add maxAge (24h) for preflight request caching
- Fix CORS_ORIGIN environment variable name in release workflow
