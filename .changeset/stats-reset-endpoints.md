---
"@hexcuit/server": minor
---

feat: add stats reset endpoints

- Add `DELETE /v1/guilds/{guildId}/stats` to reset all guild stats
- Add `DELETE /v1/guilds/{guildId}/users/{discordId}/stats` to reset user stats
- Reorganize schema definitions for better maintainability
