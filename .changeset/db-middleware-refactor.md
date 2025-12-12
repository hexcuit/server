---
"@hexcuit/server": patch
---

DB接続管理のリファクタリング

- D1 batch APIのコメントを修正（トランザクション的処理→部分失敗の可能性を明記）
- DB接続をミドルウェアに集約し、各ルーターで`c.var.db`から取得する形に統一
- 新規ファイル: `src/middlewares/dbMiddleware.ts`
- 影響範囲: `routes/guild/index.ts`, `routes/lol/rank/index.ts`, `routes/recruit/index.ts`
