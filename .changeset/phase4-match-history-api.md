---
"@hexcuit/server": minor
---

Phase 4: 試合履歴APIエンドポイント追加

- `GET /guild/match-history` - ユーザーの直近の試合履歴を取得
  - パラメータ: `guildId`, `discordId`, `limit`（デフォルト: 5）
  - レスポンス: 試合ごとの勝敗、レート変動情報
