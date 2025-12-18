---
"@hexcuit/server": major
---

**BREAKING CHANGE**: LoLロール値を大文字に変更し、名称を統一

ロール定数を小文字から大文字に変更し、Riot APIの標準に準拠:
- `'top'` → `'TOP'`
- `'jungle'` → `'JUNGLE'`
- `'mid'` → `'MIDDLE'`
- `'adc'` → `'BOTTOM'`
- `'support'` → `'SUPPORT'`

**移行が必要な箇所**:
- APIリクエスト/レスポンスで使用しているロール値を大文字に変更
- `'mid'`は`'MIDDLE'`、`'adc'`は`'BOTTOM'`に名称変更
