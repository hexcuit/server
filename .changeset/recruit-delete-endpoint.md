---
"@hexcuit/server": minor
---

募集終了時にDBから物理削除するように変更

- `POST /:id/close` → `DELETE /:id` に変更
- ステータス更新ではなくレコードを完全削除
- CASCADE設定により参加者データも自動削除
