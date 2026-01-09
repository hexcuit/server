---
'@hexcuit/server': minor
---

Restructure API routes to follow RESTful conventions

- `/guilds/queues/create` → `POST /guilds/{guildId}/queues`
- `/guilds/queues/get` → `GET /guilds/{guildId}/queues/{queueId}`
- `/guilds/users/stats/get` → `GET /guilds/{guildId}/users/{discordId}/stats`
- `/guilds/matches/votes/create` → `POST /guilds/{guildId}/matches/{matchId}/vote`
- All routes now include `guildId` as a path parameter
