---
"@hexcuit/server": minor
---

Phase 3: 勝敗報告・Elo計算機能のサーバーAPI追加

- `guildPendingMatches` テーブルを追加（投票中の試合管理）
- `guildMatchVotes` テーブルを追加（個別投票記録）
- 試合作成API: `POST /guild/match`
- 試合取得API: `GET /guild/match/:id`
- 投票API: `POST /guild/match/:id/vote`
- 試合確定API: `POST /guild/match/:id/confirm`
- 試合キャンセルAPI: `DELETE /guild/match/:id`
