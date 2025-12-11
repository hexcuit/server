---
"@hexcuit/server": patch
---

fix: 投票確定ロジックを過半数に変更

- 固定6票から参加者の過半数（Math.ceil(n/2)）に変更
- APIレスポンスにtotalParticipants, votesRequiredを追加
