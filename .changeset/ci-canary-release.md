---
"@hexcuit/server": patch
---

CI/CDワークフローの改善とビルド最適化

- mainマージ時にcanaryリリースを自動公開 (`@hexcuit/server@canary`)
- npm認証をOIDC (Trusted Publishing) に移行
- tsupによるビルド最適化でパッケージサイズを削減
- labelerにutils, tests, coreラベルを追加
