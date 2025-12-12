---
"@hexcuit/server": patch
---

型安全性とエラーハンドリングの改善

- `JSON.parse(...) as TeamAssignments` をZodバリデーションに置き換え
- CORSミドルウェアでCORS_ORIGIN未設定時に500エラーを返すように統一
