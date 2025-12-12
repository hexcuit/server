---
"@hexcuit/server": patch
---

型安全性の向上とエラーハンドリング統一

- `JSON.parse(...) as TeamAssignments` の型アサーションをZodバリデーションに変更
- CORSミドルウェアのエラーハンドリングをAPI Keyミドルウェアと統一（500エラー）
- ELO計算・投票システムに説明コメントを追加
