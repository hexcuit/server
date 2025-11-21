# @hexcuit/server

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
