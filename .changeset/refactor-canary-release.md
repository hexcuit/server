---
"@hexcuit/server": patch
---

refactor: seek-oss/changesets-snapshotを廃止し、npm OIDC Trusted Publishingに対応

- `version:canary`と`release:canary`スクリプトを追加
- canaryリリースでnpm OIDCによるトークンレス認証を使用
