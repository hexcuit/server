# @hexcuit/server

## 0.9.0

### Minor Changes

- [#56](https://github.com/hexcuit/server/pull/56) [`76003c4`](https://github.com/hexcuit/server/commit/76003c4934be237db9c1efb4caf29e0a15ece286) Thanks [@11gather11](https://github.com/11gather11)! - 型安全性の向上とスキーマ修正

  - tsconfig.json に`noUncheckedIndexedAccess`を追加
  - recruitments テーブルの`anonymous`を boolean 型に変更
  - recruitments テーブルの`capacity`を integer 型に変更
  - usersRelations のリレーション定義を修正

  ## Breaking Changes

  ### `recruitments.anonymous` の型変更

  - **Before**: `string` (`'true'` / `'false'`)
  - **After**: `boolean` (`true` / `false`)

  ### `recruitments.capacity` の型変更

  - **Before**: `string` (`'10'`)
  - **After**: `number` (`10`)

  ## Migration Guide

  ### クライアント側の対応

  API レスポンスの型が変更されるため、クライアント側で以下の対応が必要です：

  ```typescript
  // Before
  const isAnonymous = recruitment.anonymous === "true";
  const capacity = Number.parseInt(recruitment.capacity, 10);

  // After
  const isAnonymous = recruitment.anonymous; // boolean型
  const capacity = recruitment.capacity; // number型
  ```

  ### 型定義の更新

  `@hexcuit/server`パッケージを更新後、TypeScript の型エラーが発生する場合は上記の変換処理を削除してください。

- [#62](https://github.com/hexcuit/server/pull/62) [`e64f6b8`](https://github.com/hexcuit/server/commit/e64f6b8384f7876da224f0938e6c2a59379efaaa) Thanks [@11gather11](https://github.com/11gather11)! - テスト環境のセットアップ

  - Vitest と @vitest/coverage-v8 を追加
  - テスト実行用スクリプト追加（test, test:watch, test:coverage）
  - テスト用に `app` インスタンスをエクスポート
  - vitest.config.ts と tsconfig.test.json を追加
  - テストファイル群を追加（**tests**/ ディレクトリ）

### Patch Changes

- [#60](https://github.com/hexcuit/server/pull/60) [`3fafec8`](https://github.com/hexcuit/server/commit/3fafec8d2ff7f3676e6cf0f9f7086c6a5c46e219) Thanks [@11gather11](https://github.com/11gather11)! - DB 接続管理のリファクタリング

  - D1 batch API のコメントを修正（トランザクション的処理 → 部分失敗の可能性を明記）
  - DB 接続をミドルウェアに集約し、各ルーターで`c.var.db`から取得する形に統一
  - 新規ファイル: `src/middlewares/dbMiddleware.ts`
  - 影響範囲: `routes/guild/index.ts`, `routes/lol/rank/index.ts`, `routes/recruit/index.ts`

- [#58](https://github.com/hexcuit/server/pull/58) [`09fbf64`](https://github.com/hexcuit/server/commit/09fbf64bf7780fec6e9f66c7f428b91445721f27) Thanks [@11gather11](https://github.com/11gather11)! - DB アクセスの最適化とトランザクション対応

  - `getDb()` ヘルパー関数を追加し、全ルーターで統一的な DB 接続を提供
  - 試合確定処理の N+1 クエリ問題を解消（参加者レーティングの一括取得）
  - D1 batch API を使用してトランザクション的な原子操作を実現

- [#59](https://github.com/hexcuit/server/pull/59) [`3b9b790`](https://github.com/hexcuit/server/commit/3b9b7901611e2bc2f665bf206df9d361e39844f5) Thanks [@11gather11](https://github.com/11gather11)! - 型安全性の向上とエラーハンドリング統一

  - `JSON.parse(...) as TeamAssignments` の型アサーションを Zod バリデーションに変更
  - CORS ミドルウェアのエラーハンドリングを API Key ミドルウェアと統一（500 エラー）
  - ELO 計算・投票システムに説明コメントを追加

## 0.8.2

### Patch Changes

- [#54](https://github.com/hexcuit/server/pull/54) [`0f877aa`](https://github.com/hexcuit/server/commit/0f877aad6ba6f70825d8da726b483f86d02e56b5) Thanks [@11gather11](https://github.com/11gather11)! - fix: 投票確定ロジックを過半数に変更

  - 固定 6 票から参加者の過半数（Math.ceil(n/2)）に変更
  - API レスポンスに totalParticipants, votesRequired を追加

## 0.8.1

### Patch Changes

- [#52](https://github.com/hexcuit/server/pull/52) [`50a1622`](https://github.com/hexcuit/server/commit/50a1622c5f29bdf5e76a074bc20d44cbc71da3a0) Thanks [@11gather11](https://github.com/11gather11)! - fix: ロール更新 API の部分更新対応

  - `PATCH /recruit/role` で指定されたフィールドのみ更新するように修正
  - 未指定のフィールドが意図せず null で上書きされる問題を解消

## 0.8.0

### Minor Changes

- [#50](https://github.com/hexcuit/server/pull/50) [`8da78d4`](https://github.com/hexcuit/server/commit/8da78d494a93b76640627513aed22c161b0881d4) Thanks [@11gather11](https://github.com/11gather11)! - Phase 4: 試合履歴 API エンドポイント追加

  - `GET /guild/match-history` - ユーザーの直近の試合履歴を取得
    - パラメータ: `guildId`, `discordId`, `limit`（デフォルト: 5）
    - レスポンス: 試合ごとの勝敗、レート変動情報

## 0.7.0

### Minor Changes

- [#48](https://github.com/hexcuit/server/pull/48) [`bd5e90b`](https://github.com/hexcuit/server/commit/bd5e90bd872ebddc959eb81d7c7be564b6c30d3c) Thanks [@11gather11](https://github.com/11gather11)! - Phase 3: 勝敗報告・Elo 計算機能のサーバー API 追加

  - `guildPendingMatches` テーブルを追加（投票中の試合管理）
  - `guildMatchVotes` テーブルを追加（個別投票記録）
  - 試合作成 API: `POST /guild/match`
  - 試合取得 API: `GET /guild/match/:id`
  - 投票 API: `POST /guild/match/:id/vote`
  - 試合確定 API: `POST /guild/match/:id/confirm`
  - 試合キャンセル API: `DELETE /guild/match/:id`

## 0.6.0

### Minor Changes

- [#46](https://github.com/hexcuit/server/pull/46) [`f191869`](https://github.com/hexcuit/server/commit/f191869234f2b088db66aa300740a58ddfb92569) Thanks [@11gather11](https://github.com/11gather11)! - Phase 2: ランク戦募集機能の追加

  - recruitments テーブルに type カラムを追加 ('normal' | 'ranked')
  - recruitment_participants テーブルに mainRole/subRole カラムを追加
  - recruit API に type, mainRole, subRole サポートを追加
  - /recruit/update-role エンドポイントを追加
  - LOL_ROLES 定数をエクスポート

## 0.5.0

### Minor Changes

- [#44](https://github.com/hexcuit/server/pull/44) [`480d808`](https://github.com/hexcuit/server/commit/480d808427e865aebee6570243a8145eca016a47) Thanks [@11gather11](https://github.com/11gather11)! - サーバー内ランクシステム Phase 1: スキーマ + API 基盤

  - `guild_ratings` テーブル追加（サーバー内レーティング）
  - `guild_matches` テーブル追加（試合履歴）
  - `guild_match_participants` テーブル追加（試合参加者）
  - `/guild/rating` エンドポイント追加（レート取得・初期化）
  - `/guild/ranking` エンドポイント追加（ランキング取得）
  - Elo レーティング計算ユーティリティ追加
  - プレイスメント: 5 試合

## 0.4.0

### Minor Changes

- [#42](https://github.com/hexcuit/server/pull/42) [`834a010`](https://github.com/hexcuit/server/commit/834a0107a09686becfc5442adab075ece2d36bfb) Thanks [@11gather11](https://github.com/11gather11)! - BREAKING CHANGE: `/rank` エンドポイントを `/lol/rank` に移動

  将来のサーバー内ランクシステム（`/guild/*`）追加に向けた構造変更。
  LoL 関連の API は `/lol/*` 配下に統一。

## 0.3.0

### Minor Changes

- [#31](https://github.com/hexcuit/server/pull/31) [`d400e86`](https://github.com/hexcuit/server/commit/d400e86652e23894fb2850572a43c338d3735ebb) Thanks [@11gather11](https://github.com/11gather11)! - 募集終了時に DB から物理削除するように変更

  - `POST /:id/close` → `DELETE /:id` に変更
  - ステータス更新ではなくレコードを完全削除
  - CASCADE 設定により参加者データも自動削除

## 0.2.0

### Minor Changes

- [#29](https://github.com/hexcuit/server/pull/29) [`1858cae`](https://github.com/hexcuit/server/commit/1858cae40655e9856d8e44d596b0fb771e481db7) Thanks [@11gather11](https://github.com/11gather11)! - Add recruitment API endpoints for custom game recruitment feature

  - POST /recruit - Create recruitment
  - GET /recruit/:id - Get recruitment details
  - POST /recruit/join - Join recruitment
  - POST /recruit/leave - Leave recruitment
  - POST /recruit/:id/close - Close recruitment

## 0.1.12

### Patch Changes

- [#21](https://github.com/hexcuit/server/pull/21) [`fe95679`](https://github.com/hexcuit/server/commit/fe9567991f00b1717f7c3204c4a983589b2b6f2e) Thanks [@11gather11](https://github.com/11gather11)! - Fix wrangler-action secrets format in release workflow

## 0.1.11

### Patch Changes

- [#19](https://github.com/hexcuit/server/pull/19) [`aa586a8`](https://github.com/hexcuit/server/commit/aa586a8d48249355e6707cad51d2599d25e18d99) Thanks [@11gather11](https://github.com/11gather11)! - Improve CORS configuration for production environment

  - Add early return for empty origin to prevent null origin bypass
  - Add maxAge (24h) for preflight request caching
  - Fix CORS_ORIGIN environment variable name in release workflow

## 0.1.10

### Patch Changes

- [#15](https://github.com/hexcuit/server/pull/15) [`2b28755`](https://github.com/hexcuit/server/commit/2b28755aefd86b989e841c1cdeb2c268603ae776) Thanks [@11gather11](https://github.com/11gather11)! - Add automated deployment to Cloudflare Workers

  - Add D1 migrations step after release
  - Add Cloudflare Workers deploy step
  - Remove unused lolRanks table from schema
  - Use frozen-lockfile for reproducible builds

## 0.1.8

### Patch Changes

- [#6](https://github.com/hexcuit/server/pull/6) [`98ff188`](https://github.com/hexcuit/server/commit/98ff188db5379f7bb412810e24165d65a9d5b373) Thanks [@11gather11](https://github.com/11gather11)! - ci 変更

- [#4](https://github.com/hexcuit/server/pull/4) [`3c75eee`](https://github.com/hexcuit/server/commit/3c75eeea30cf28dc069ce9f2714aae8d5c30eefb) Thanks [@11gather11](https://github.com/11gather11)! - コメント追加

- [#2](https://github.com/hexcuit/server/pull/2) [`9d3a910`](https://github.com/hexcuit/server/commit/9d3a910a4040a83663d74fa0fc78c5e1e5345d4d) Thanks [@11gather11](https://github.com/11gather11)! - 1
