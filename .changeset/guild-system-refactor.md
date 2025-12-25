---
"@hexcuit/server": minor
---

**BREAKING CHANGE**: Guild-based architecture refactor with route reorganization and schema improvements

Major refactoring to introduce guild-scoped resource management and improve type safety:

**Breaking Changes:**
- Queue routes moved: `/v1/queues/*` → `/v1/guilds/:guildId/queues/*`
- Schema table renames: `guild_ratings` → `guild_user_stats`, `guild_match_participants` → `guild_match_players`
- Explicit enum types for all status and type fields (queue status, queue type, vote options, match results)

**New Features:**
- Added `guilds` table as foundation for guild-based system
- Added draw voting support in match confirmation
- Enhanced match voting logic with 2-phase confirmation (early majority / final plurality)

**Improvements:**
- All database schemas now use explicit enum types instead of string literals
- CI workflows enhanced with Drizzle migration validation
- Test descriptions standardized to English
- Removed unused match removal functionality

**Database Migrations:**
- Added 7 new migrations (0013-0019) for schema reorganization
- Custom `isoDateTime` type for consistent timestamp handling

**Migration Guide:**
- Update API client to use new queue routes under `/v1/guilds/:guildId/queues/`
- Ensure all guild IDs are provided when accessing queue resources
- Update any direct database queries to use new table names
