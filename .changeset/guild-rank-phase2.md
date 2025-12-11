---
"@hexcuit/server": minor
---

Phase 2: ランク戦募集機能の追加

- recruitmentsテーブルにtypeカラムを追加 ('normal' | 'ranked')
- recruitment_participantsテーブルにmainRole/subRoleカラムを追加
- recruit APIにtype, mainRole, subRoleサポートを追加
- /recruit/update-role エンドポイントを追加
- LOL_ROLES定数をエクスポート
