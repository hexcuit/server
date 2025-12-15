---
"@hexcuit/server": patch
---

ルートファイルの構造を改善し、未使用のユーティリティを削除

- 大きなルートファイルをエンドポイント別に分割して保守性を向上
  - `src/routes/lol/rank/` → get.ts, create.ts, schemas.ts
  - `src/routes/recruit/` → get.ts, create.ts, delete.ts, join.ts, leave.ts, update-role.ts, schemas.ts
  - `src/routes/guild/` → create-rating.ts, get-ratings.ts, get-ranking.ts, create-match.ts, confirm-match.ts, vote-match.ts, cancel-match.ts, get-match.ts, get-match-history.ts, schemas.ts
- 未使用のDB関連ユーティリティを削除
  - `src/middlewares/dbMiddleware.ts`
  - `src/utils/db.ts`
- OpenAPI設定からexplicitなtagsの配列を削除してコードを簡素化
