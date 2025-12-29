# API仕様書

## 実装状況

### Phase 1: 基盤
- [x] Users
  - [x] POST /v1/users
  - [x] GET /v1/users/:discordId
  - [x] PUT /v1/users/:discordId/rank
- [x] Guilds
  - [x] POST /v1/guilds
  - [x] GET /v1/guilds/:guildId
  - [x] PATCH /v1/guilds/:guildId
- [x] GuildSettings
  - [x] GET /v1/guilds/:guildId/settings
  - [x] PATCH /v1/guilds/:guildId/settings

### Phase 2: 統計
- [x] GuildUserStats
  - [x] POST /v1/guilds/:guildId/users/:discordId/stats
  - [x] GET /v1/guilds/:guildId/users/:discordId/stats
  - [x] PATCH /v1/guilds/:guildId/users/:discordId/stats
  - [x] DELETE /v1/guilds/:guildId/users/:discordId/stats
- [x] Rankings
  - [x] GET /v1/guilds/:guildId/rankings

### Phase 3: キュー
- [x] Queues
  - [x] POST /v1/guilds/:guildId/queues
  - [x] GET /v1/guilds/:guildId/queues/:queueId
  - [x] DELETE /v1/guilds/:guildId/queues/:queueId
- [x] QueuePlayers
  - [x] POST /v1/guilds/:guildId/queues/:queueId/players
  - [x] DELETE /v1/guilds/:guildId/queues/:queueId/players/:discordId

### Phase 4: 試合
- [ ] Matches
  - [ ] POST /v1/guilds/:guildId/matches
  - [ ] GET /v1/guilds/:guildId/matches/:matchId
- [ ] Votes
  - [ ] POST /v1/guilds/:guildId/matches/:matchId/votes
- [ ] Confirm
  - [ ] POST /v1/guilds/:guildId/matches/:matchId/confirm
- [ ] History
  - [ ] GET /v1/guilds/:guildId/users/:discordId/history

---

## 概要

- ベースURL: `/v1`
- 認証: `x-api-key` ヘッダー
- ページネーション: `offset` 方式（`?limit=10&offset=0`）

---

## ディレクトリ構成

```
src/routes/v1/
├── index.ts
├── users/
│   ├── index.ts
│   ├── schemas.ts
│   ├── create.ts               # POST /users
│   ├── get.ts                  # GET /users/:discordId
│   └── rank/
│       └── upsert.ts           # PUT /users/:discordId/rank
├── guilds/
│   ├── index.ts
│   ├── schemas.ts
│   ├── create.ts               # POST /guilds
│   ├── get.ts                  # GET /guilds/:guildId
│   ├── update.ts               # PATCH /guilds/:guildId
│   ├── settings/
│   │   ├── get.ts              # GET /guilds/:guildId/settings
│   │   └── update.ts           # PATCH /guilds/:guildId/settings
│   ├── users/
│   │   ├── stats/
│   │   │   ├── create.ts       # POST .../stats
│   │   │   ├── get.ts          # GET .../stats
│   │   │   ├── update.ts       # PATCH .../stats
│   │   │   └── delete.ts       # DELETE .../stats
│   │   └── history/
│   │       └── get.ts          # GET .../history
│   ├── rankings/
│   │   └── get.ts              # GET /guilds/:guildId/rankings
│   ├── queues/
│   │   ├── create.ts
│   │   ├── get.ts
│   │   ├── delete.ts
│   │   └── players/
│   │       ├── create.ts
│   │       └── delete.ts
│   └── matches/
│       ├── create.ts
│       ├── get.ts
│       ├── votes/
│       │   └── create.ts
│       └── confirm.ts
```

---

## 1. Users

### POST /v1/users
ユーザー作成

**Request Body:**
```json
{
  "discordId": "123456789"
}
```

**Response:** `201 Created`
```json
{
  "discordId": "123456789",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

### GET /v1/users/:discordId
ユーザー取得

**Response:** `200 OK`
```json
{
  "discordId": "123456789",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "rank": {
    "tier": "GOLD",
    "division": "IV"
  }
}
```

### PUT /v1/users/:discordId/rank
ランク更新（upsert）

**Request Body:**
```json
{
  "tier": "GOLD",
  "division": "IV"
}
```

**Response:** `200 OK`
```json
{
  "tier": "GOLD",
  "division": "IV",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

---

## 2. Guilds

### POST /v1/guilds
ギルド作成

**Request Body:**
```json
{
  "guildId": "987654321"
}
```

**Response:** `201 Created`
```json
{
  "guildId": "987654321",
  "plan": "free",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

### GET /v1/guilds/:guildId
ギルド取得

**Response:** `200 OK`
```json
{
  "guildId": "987654321",
  "plan": "free",
  "planExpiresAt": null,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

### PATCH /v1/guilds/:guildId
ギルド更新

**Request Body:**
```json
{
  "plan": "premium",
  "planExpiresAt": "2026-01-01T00:00:00.000Z"
}
```

**Response:** `200 OK`

### GET /v1/guilds/:guildId/settings
設定取得

**Response:** `200 OK`
```json
{
  "initialRating": 1200,
  "kFactor": 32,
  "placementGamesRequired": 5
}
```

### PATCH /v1/guilds/:guildId/settings
設定更新

**Request Body:**
```json
{
  "initialRating": 1500,
  "kFactor": 40
}
```

**Response:** `200 OK`

---

## 3. Guild User Stats

### POST /v1/guilds/:guildId/users/:discordId/stats
統計初期化

**Response:** `201 Created`
```json
{
  "discordId": "123456789",
  "rating": 1200,
  "wins": 0,
  "losses": 0,
  "placementGames": 0,
  "peakRating": 1200,
  "currentStreak": 0
}
```

### GET /v1/guilds/:guildId/users/:discordId/stats
統計取得

**Response:** `200 OK`
```json
{
  "discordId": "123456789",
  "rating": 1350,
  "wins": 10,
  "losses": 5,
  "placementGames": 5,
  "peakRating": 1400,
  "currentStreak": 3,
  "lastPlayedAt": "2025-01-01T00:00:00.000Z"
}
```

### PATCH /v1/guilds/:guildId/users/:discordId/stats
統計更新（管理者用）

**Request Body:**
```json
{
  "rating": 1500
}
```

**Response:** `200 OK`

### DELETE /v1/guilds/:guildId/users/:discordId/stats
統計リセット

**Response:** `204 No Content`

### GET /v1/guilds/:guildId/rankings
ランキング取得

**Query Parameters:**
- `limit`: 取得件数（デフォルト: 10）
- `offset`: オフセット（デフォルト: 0）

**Response:** `200 OK`
```json
{
  "rankings": [
    {
      "rank": 1,
      "discordId": "123456789",
      "rating": 1500,
      "wins": 20,
      "losses": 5
    }
  ],
  "total": 100
}
```

---

## 4. Queues

### POST /v1/guilds/:guildId/queues
キュー作成

**Request Body:**
```json
{
  "channelId": "111111111",
  "messageId": "222222222",
  "creatorId": "123456789",
  "type": "SOLO_RANK",
  "anonymous": false,
  "capacity": 10
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid-xxx",
  "status": "open"
}
```

### GET /v1/guilds/:guildId/queues/:queueId
キュー取得

**Response:** `200 OK`
```json
{
  "id": "uuid-xxx",
  "channelId": "111111111",
  "messageId": "222222222",
  "type": "SOLO_RANK",
  "anonymous": false,
  "capacity": 10,
  "status": "open",
  "players": [
    {
      "discordId": "123456789",
      "mainRole": "MID",
      "subRole": "TOP",
      "joinedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### DELETE /v1/guilds/:guildId/queues/:queueId
キュー削除

**Response:** `204 No Content`

### POST /v1/guilds/:guildId/queues/:queueId/players
プレイヤー参加

**Request Body:**
```json
{
  "discordId": "123456789",
  "mainRole": "MID",
  "subRole": "TOP"
}
```

**Response:** `201 Created`

### DELETE /v1/guilds/:guildId/queues/:queueId/players/:discordId
プレイヤー離脱

**Response:** `204 No Content`

---

## 5. Matches

### POST /v1/guilds/:guildId/matches
試合作成

**Request Body:**
```json
{
  "channelId": "111111111",
  "messageId": "333333333",
  "players": [
    {
      "discordId": "123456789",
      "team": "BLUE",
      "role": "MID"
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid-xxx",
  "status": "voting"
}
```

### GET /v1/guilds/:guildId/matches/:matchId
試合取得

**Response:** `200 OK`
```json
{
  "id": "uuid-xxx",
  "status": "voting",
  "blueVotes": 3,
  "redVotes": 2,
  "drawVotes": 0,
  "players": [
    {
      "discordId": "123456789",
      "team": "BLUE",
      "role": "MID",
      "ratingBefore": 1200
    }
  ],
  "votes": [
    {
      "discordId": "123456789",
      "vote": "BLUE"
    }
  ]
}
```

### POST /v1/guilds/:guildId/matches/:matchId/votes
投票

**Request Body:**
```json
{
  "discordId": "123456789",
  "vote": "BLUE"
}
```

**Response:** `200 OK`
```json
{
  "changed": true,
  "blueVotes": 4,
  "redVotes": 2,
  "drawVotes": 0,
  "totalParticipants": 10,
  "votesRequired": 6
}
```

### POST /v1/guilds/:guildId/matches/:matchId/confirm
試合確定

**Response:** `200 OK`
```json
{
  "confirmed": true,
  "winningTeam": "BLUE",
  "ratingChanges": [
    {
      "discordId": "123456789",
      "ratingBefore": 1200,
      "ratingAfter": 1215,
      "ratingChange": 15
    }
  ]
}
```

### GET /v1/guilds/:guildId/users/:discordId/history
ユーザー試合履歴

**Query Parameters:**
- `limit`: 取得件数（デフォルト: 10）
- `offset`: オフセット（デフォルト: 0）

**Response:** `200 OK`
```json
{
  "history": [
    {
      "matchId": "uuid-xxx",
      "result": "WIN",
      "ratingChange": 15,
      "ratingAfter": 1215,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 50
}
```

---

## エラーレスポンス

```json
{
  "message": "エラーメッセージ"
}
```

| Status | 説明 |
|--------|------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Internal Server Error |
