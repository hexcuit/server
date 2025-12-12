---
"@hexcuit/server": major
---

型安全性の向上とスキーマ修正

- tsconfig.jsonに`noUncheckedIndexedAccess`を追加
- recruitmentsテーブルの`anonymous`をboolean型に変更
- recruitmentsテーブルの`capacity`をinteger型に変更
- usersRelationsのリレーション定義を修正

## Breaking Changes

### `recruitments.anonymous` の型変更
- **Before**: `string` (`'true'` / `'false'`)
- **After**: `boolean` (`true` / `false`)

### `recruitments.capacity` の型変更
- **Before**: `string` (`'10'`)
- **After**: `number` (`10`)

## Migration Guide

### クライアント側の対応

APIレスポンスの型が変更されるため、クライアント側で以下の対応が必要です：

```typescript
// Before
const isAnonymous = recruitment.anonymous === 'true'
const capacity = Number.parseInt(recruitment.capacity, 10)

// After
const isAnonymous = recruitment.anonymous  // boolean型
const capacity = recruitment.capacity       // number型
```

### 型定義の更新

`@hexcuit/server`パッケージを更新後、TypeScriptの型エラーが発生する場合は上記の変換処理を削除してください。
