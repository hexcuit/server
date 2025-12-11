---
"@hexcuit/server": patch
---

fix: ロール更新APIの部分更新対応

- `PATCH /recruit/role` で指定されたフィールドのみ更新するように修正
- 未指定のフィールドが意図せずnullで上書きされる問題を解消
