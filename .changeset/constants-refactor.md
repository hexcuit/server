---
"@hexcuit/server": patch
---

LoL関連の定数を`src/constants/`に集約し、コードベース全体で型安全性を向上

- `src/constants/lol.ts`に`LOL_TIERS`, `LOL_DIVISIONS`, `LOL_ROLES`を定義
- DBスキーマでenum型を使用するように変更
- ミドルウェアのユニットテストを追加
- APIキーミドルウェアのエラーレスポンスを401 Unauthorizedに修正
