# @hexcuit/server

Hono RPC type-safe client for Project LoL Server

## Installation

```bash
npm install @hexcuit/server
```

## Usage

```typescript
import { hcWithType, type Client } from '@hexcuit/server'

// Create type-safe client
const client = hcWithType('https://your-api.com')

// Type-safe API calls
const result = await client.rank.$get({
  query: { discordIds: ['123', '456'] }
})

// Type inference works automatically
const ranks = result.ranks // fully typed
```

## Development

### Server Development

```bash
npm install
npm run dev
```

### Deploy

```bash
npm run deploy
```

### Type Generation

[For generating/synchronizing types based on your Worker configuration](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```bash
npm run cf-typegen
```

### Build for npm

```bash
npm run build
```

## Publishing

This package is automatically published to npm via GitHub Actions when a new version tag is pushed:

```bash
npm version patch  # 0.1.7 → 0.1.8
git push --follow-tags
```

## License

MIT
