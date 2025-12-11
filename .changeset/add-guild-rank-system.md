---
"@hexcuit/server": minor
---

サーバー内ランクシステム Phase 1: スキーマ + API基盤

- `guild_ratings` テーブル追加（サーバー内レーティング）
- `guild_matches` テーブル追加（試合履歴）
- `guild_match_participants` テーブル追加（試合参加者）
- `/guild/rating` エンドポイント追加（レート取得・初期化）
- `/guild/ranking` エンドポイント追加（ランキング取得）
- Eloレーティング計算ユーティリティ追加
- プレイスメント: 5試合
