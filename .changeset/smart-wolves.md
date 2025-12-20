---
"@hexcuit/server": minor
---

クライアントビルド方式を刷新し、型定義生成を自動化

- `scripts/generate-client.ts`を追加し、全ルートから`typedApp`を自動検出
- `src/client.ts`を自動生成（チェーンメソッドで全ルートを統合）
- `dist/client.js`を最小限のランタイムとして生成
- tsup設定を`dts: { only: true }`に変更し、型定義のみ生成
- バンドルサイズを400KB+から86bytesに削減
- 各ルートファイルから個別の`hcWithType`エクスポートを削除
- `typedApp`エクスポートを維持（自動検出用）
- `bun run generate:client`で新ルート追加時に自動反映
