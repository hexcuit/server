---
"@hexcuit/server": patch
---

Fix foreign key constraint error in queue creation by ensuring creator user exists before insert. Add first-call tests to verify auto-creation of guilds and users across endpoints.
