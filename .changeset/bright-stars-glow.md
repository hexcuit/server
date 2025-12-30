---
"@hexcuit/server": minor
---

Add guild stats delete endpoint and switch to Swagger UI

- Add DELETE `/v1/guilds/{guildId}/stats` endpoint to reset all user stats in a guild
- Replace `@scalar/hono-api-reference` with `@hono/swagger-ui` for API documentation
- Improve client generation script with colored output and missing export warnings
