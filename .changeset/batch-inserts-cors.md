---
"@hexcuit/server": patch
---

DBインサートをバッチ処理に変更し、CORSヘッダーにx-api-keyを追加

- `create.ts`: 逐次DBインサートを`db.batch()`でまとめてパフォーマンス改善
- `corsMiddleware.ts`: `allowHeaders`に`x-api-key`を追加
