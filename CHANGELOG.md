# @hexcuit/server

## 0.11.1

### Patch Changes

- [#98](https://github.com/hexcuit/server/pull/98) [`a91edf1`](https://github.com/hexcuit/server/commit/a91edf14f9e52faa74aef18725ba7522e1a7e758) Thanks [@11gather11](https://github.com/11gather11)! - Fix foreign key constraint error in queue creation by ensuring creator user exists before insert. Add first-call tests to verify auto-creation of guilds and users across endpoints.

## 0.11.0

### Minor Changes

- [#95](https://github.com/hexcuit/server/pull/95) [`7059dc1`](https://github.com/hexcuit/server/commit/7059dc1cfd494368478b416c20723dc07b7d1d09) Thanks [@11gather11](https://github.com/11gather11)! - Add guild stats delete endpoint and switch to Swagger UI

  - Add DELETE `/v1/guilds/{guildId}/stats` endpoint to reset all user stats in a guild
  - Replace `@scalar/hono-api-reference` with `@hono/swagger-ui` for API documentation
  - Improve client generation script with colored output and missing export warnings

## 0.10.0

### Minor Changes

- [#93](https://github.com/hexcuit/server/pull/93) [`bf918bb`](https://github.com/hexcuit/server/commit/bf918bb4001ef29c62dbe3e00cf90a4e8359ab29) Thanks [@11gather11](https://github.com/11gather11)! - Complete API rewrite with redesigned database schema

  - Redesign DB schema with new table structure for users, guilds, matches, and queues
  - Implement full REST API for all resources (users, guilds, guild settings, matches, queues, rankings)
  - Add match confirmation and voting system with improved rating calculations
  - Add user stats card image generation
  - Add auto-creation for guilds and users on first interaction
  - Rename lolRanks to ranks for consistency

## 0.9.0

### Minor Changes

- [#89](https://github.com/hexcuit/server/pull/89) [`f2131f2`](https://github.com/hexcuit/server/commit/f2131f261b4cb5aa0a1e91ddce2b67fed6955df8) Thanks [@11gather11](https://github.com/11gather11)! - **BREAKING CHANGE**: Guild-based architecture refactor with route reorganization and schema improvements

  Major refactoring to introduce guild-scoped resource management and improve type safety:

  **Breaking Changes:**

  - Queue routes moved: `/v1/queues/*` → `/v1/guilds/:guildId/queues/*`
  - Schema table renames: `guild_ratings` → `guild_user_stats`, `guild_match_participants` → `guild_match_players`
  - Explicit enum types for all status and type fields (queue status, queue type, vote options, match results)

  **New Features:**

  - Added `guilds` table as foundation for guild-based system
  - Added draw voting support in match confirmation
  - Enhanced match voting logic with 2-phase confirmation (early majority / final plurality)

  **Improvements:**

  - All database schemas now use explicit enum types instead of string literals
  - CI workflows enhanced with Drizzle migration validation
  - Test descriptions standardized to English
  - Removed unused match removal functionality

  **Database Migrations:**

  - Added 7 new migrations (0013-0019) for schema reorganization
  - Custom `isoDateTime` type for consistent timestamp handling

  **Migration Guide:**

  - Update API client to use new queue routes under `/v1/guilds/:guildId/queues/`
  - Ensure all guild IDs are provided when accessing queue resources
  - Update any direct database queries to use new table names

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

- [#76](https://github.com/hexcuit/server/pull/76) [`92d3a4b`](https://github.com/hexcuit/server/commit/92d3a4be59768ebbb9fb83ac27c04b331df7140a) Thanks [@11gather11](https://github.com/11gather11)! - クライアントビルド方式を刷新し、型定義生成を自動化

  - `scripts/generate-client.ts`を追加し、全ルートから`typedApp`を自動検出
  - `src/client.ts`を自動生成（チェーンメソッドで全ルートを統合）
  - `dist/client.js`を最小限のランタイムとして生成
  - tsup 設定を`dts: { only: true }`に変更し、型定義のみ生成
  - バンドルサイズを 400KB+から 86bytes に削減
  - 各ルートファイルから個別の`hcWithType`エクスポートを削除
  - `typedApp`エクスポートを維持（自動検出用）
  - `bun run generate:client`で新ルート追加時に自動反映

- [#91](https://github.com/hexcuit/server/pull/91) [`2ed8776`](https://github.com/hexcuit/server/commit/2ed8776a4d253ca2eb7a5204141d057811de86dc) Thanks [@11gather11](https://github.com/11gather11)! - feat: add stats reset endpoints

  - Add `DELETE /v1/guilds/{guildId}/stats` to reset all guild stats
  - Add `DELETE /v1/guilds/{guildId}/users/{discordId}/stats` to reset user stats
  - Reorganize schema definitions for better maintainability

- [#62](https://github.com/hexcuit/server/pull/62) [`e64f6b8`](https://github.com/hexcuit/server/commit/e64f6b8384f7876da224f0938e6c2a59379efaaa) Thanks [@11gather11](https://github.com/11gather11)! - テスト環境のセットアップ

  - Vitest と @vitest/coverage-v8 を追加
  - テスト実行用スクリプト追加（test, test:watch, test:coverage）
  - テスト用に `app` インスタンスをエクスポート
  - vitest.config.ts と tsconfig.test.json を追加
  - テストファイル群を追加（**tests**/ ディレクトリ）

- [#75](https://github.com/hexcuit/server/pull/75) [`7e3f9d8`](https://github.com/hexcuit/server/commit/7e3f9d8f6bba362a71c2261b382cd92f5f6fe039) Thanks [@11gather11](https://github.com/11gather11)! - **BREAKING CHANGE**: LoL ロール値を大文字に変更し、名称を統一

  ロール定数を小文字から大文字に変更し、Riot API の標準に準拠:

  - `'top'` → `'TOP'`
  - `'jungle'` → `'JUNGLE'`
  - `'mid'` → `'MIDDLE'`
  - `'adc'` → `'BOTTOM'`
  - `'support'` → `'SUPPORT'`

  **移行が必要な箇所**:

  - API リクエスト/レスポンスで使用しているロール値を大文字に変更
  - `'mid'`は`'MIDDLE'`、`'adc'`は`'BOTTOM'`に名称変更

### Patch Changes

- [#90](https://github.com/hexcuit/server/pull/90) [`835ecd8`](https://github.com/hexcuit/server/commit/835ecd80c067d9eadcee7aab324524e80f5847e0) Thanks [@11gather11](https://github.com/11gather11)! - DB インサートをバッチ処理に変更し、CORS ヘッダーに x-api-key を追加

  - `create.ts`: 逐次 DB インサートを`db.batch()`でまとめてパフォーマンス改善
  - `corsMiddleware.ts`: `allowHeaders`に`x-api-key`を追加

- [#69](https://github.com/hexcuit/server/pull/69) [`6f2fd2d`](https://github.com/hexcuit/server/commit/6f2fd2dc71e4992ab0996d5368336e97d1c169fa) Thanks [@11gather11](https://github.com/11gather11)! - CI/CD ワークフローの改善とビルド最適化

  - main マージ時に canary リリースを自動公開 (`@hexcuit/server@canary`)
  - npm 認証を OIDC (Trusted Publishing) に移行
  - tsup によるビルド最適化でパッケージサイズを削減
  - labeler に utils, tests, core ラベルを追加

- [#68](https://github.com/hexcuit/server/pull/68) [`ae0c60f`](https://github.com/hexcuit/server/commit/ae0c60fc571d733a5925affad455be3882c411c6) Thanks [@11gather11](https://github.com/11gather11)! - LoL 関連の定数を`src/constants/`に集約し、コードベース全体で型安全性を向上

  - `src/constants/lol.ts`に`LOL_TIERS`, `LOL_DIVISIONS`, `LOL_ROLES`を定義
  - DB スキーマで enum 型を使用するように変更
  - ミドルウェアのユニットテストを追加
  - API キーミドルウェアのエラーレスポンスを 401 Unauthorized に修正

- [#60](https://github.com/hexcuit/server/pull/60) [`3fafec8`](https://github.com/hexcuit/server/commit/3fafec8d2ff7f3676e6cf0f9f7086c6a5c46e219) Thanks [@11gather11](https://github.com/11gather11)! - DB 接続管理のリファクタリング

  - D1 batch API のコメントを修正（トランザクション的処理 → 部分失敗の可能性を明記）
  - DB 接続をミドルウェアに集約し、各ルーターで`c.var.db`から取得する形に統一
  - 新規ファイル: `src/middlewares/dbMiddleware.ts`
  - 影響範囲: `routes/guild/index.ts`, `routes/lol/rank/index.ts`, `routes/recruit/index.ts`

- [#72](https://github.com/hexcuit/server/pull/72) [`964a71f`](https://github.com/hexcuit/server/commit/964a71fee81072ede1ecab04474fa25ce94880c9) Thanks [@11gather11](https://github.com/11gather11)! - fix: canary バージョンを現在のバージョンベースに変更

- [#83](https://github.com/hexcuit/server/pull/83) [`99aa067`](https://github.com/hexcuit/server/commit/99aa06741ba1dfb0de428c1719a5bc8efd4b3171) Thanks [@11gather11](https://github.com/11gather11)! - refactor: migrate tests from Vitest to Bun test runner

- [#58](https://github.com/hexcuit/server/pull/58) [`09fbf64`](https://github.com/hexcuit/server/commit/09fbf64bf7780fec6e9f66c7f428b91445721f27) Thanks [@11gather11](https://github.com/11gather11)! - DB アクセスの最適化とトランザクション対応

  - `getDb()` ヘルパー関数を追加し、全ルーターで統一的な DB 接続を提供
  - 試合確定処理の N+1 クエリ問題を解消（参加者レーティングの一括取得）
  - D1 batch API を使用してトランザクション的な原子操作を実現

- [#59](https://github.com/hexcuit/server/pull/59) [`3b9b790`](https://github.com/hexcuit/server/commit/3b9b7901611e2bc2f665bf206df9d361e39844f5) Thanks [@11gather11](https://github.com/11gather11)! - 型安全性の向上とエラーハンドリング統一

  - `JSON.parse(...) as TeamAssignments` の型アサーションを Zod バリデーションに変更
  - CORS ミドルウェアのエラーハンドリングを API Key ミドルウェアと統一（500 エラー）
  - ELO 計算・投票システムに説明コメントを追加

- [#71](https://github.com/hexcuit/server/pull/71) [`9daaeee`](https://github.com/hexcuit/server/commit/9daaeee4042dd5eae1ec0edd157a2dea513dc265) Thanks [@11gather11](https://github.com/11gather11)! - refactor: seek-oss/changesets-snapshot を廃止し、npm OIDC Trusted Publishing に対応

  - `version:canary`と`release:canary`スクリプトを追加
  - canary リリースで npm OIDC によるトークンレス認証を使用

- [#88](https://github.com/hexcuit/server/pull/88) [`6bb996e`](https://github.com/hexcuit/server/commit/6bb996ebf512ca73e3658b5e7994c9186ea158a9) Thanks [@11gather11](https://github.com/11gather11)! - Remove unused queue player update endpoint and translate Japanese comments to English

- [#65](https://github.com/hexcuit/server/pull/65) [`6f7f292`](https://github.com/hexcuit/server/commit/6f7f2924841b04820617e886d64bd5326a0fff9f) Thanks [@11gather11](https://github.com/11gather11)! - ルートファイルの構造を改善し、未使用のユーティリティを削除

  - 大きなルートファイルをエンドポイント別に分割して保守性を向上
    - `src/routes/lol/rank/` → get.ts, create.ts, schemas.ts
    - `src/routes/recruit/` → get.ts, create.ts, delete.ts, join.ts, leave.ts, update-role.ts, schemas.ts
    - `src/routes/guild/` → create-rating.ts, get-ratings.ts, get-ranking.ts, create-match.ts, confirm-match.ts, vote-match.ts, cancel-match.ts, get-match.ts, get-match-history.ts, schemas.ts
  - 未使用の DB 関連ユーティリティを削除
    - `src/middlewares/dbMiddleware.ts`
    - `src/utils/db.ts`
  - OpenAPI 設定から explicit な tags の配列を削除してコードを簡素化

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
