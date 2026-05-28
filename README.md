# VibeTogether

> Listen Together. Anywhere.
> Real-time synchronized Spotify listening rooms — same song, same second, same goosebumps.

This is the initial scaffold: a polished frontend showcase plus a backend skeleton with real auth, sync, and persistence wiring. Drop in your OAuth credentials and you can take it the rest of the way.

---

## Repository layout

```
vibetogether/
├── web/                       # Next.js 15 app (App Router, TS, Tailwind)
│   ├── app/
│   │   ├── (marketing)/       # landing page
│   │   ├── (auth)/            # login + onboarding
│   │   ├── (app)/             # dashboard, rooms, discover, friends, etc.
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── landing/           # hero, features, demo, testimonials, footer
│   │   ├── app/               # sidebar, topbar, room cards
│   │   ├── room/              # reactions overlay, lyrics
│   │   ├── shared/            # logo, visualizer, album art, background fx
│   │   └── ui/                # button, glass card, avatar
│   ├── lib/
│   │   ├── socket.ts          # Socket.IO client + clock sync
│   │   ├── mock-data.ts       # showcase data
│   │   └── utils.ts
│   ├── stores/room-store.ts   # Zustand store for live rooms
│   ├── tailwind.config.ts
│   └── next.config.mjs
│
├── api/                       # Express + Socket.IO + Prisma
│   ├── src/
│   │   ├── index.ts           # boot + middleware
│   │   ├── auth/routes.ts     # Google OAuth + refresh tokens
│   │   ├── spotify/routes.ts  # Spotify OAuth + search proxy
│   │   ├── rooms/routes.ts    # CRUD + join by code
│   │   ├── users/routes.ts
│   │   ├── sockets/
│   │   │   ├── server.ts      # Socket.IO + Redis adapter + room events
│   │   │   ├── sync.ts        # canonical playback state + Redis hot cache
│   │   │   └── events.ts      # typed event contract (server <-> client)
│   │   ├── middleware/
│   │   └── lib/               # prisma, redis, jwt, env (zod-validated)
│   ├── prisma/schema.prisma   # full data model
│   └── Dockerfile
│
├── docker-compose.yml         # Postgres + Redis for local dev
├── .env.example
└── README.md                  # you are here
```

---

## Quick start

### 1. Prerequisites
- Node.js 20+
- Docker (for Postgres + Redis) — or your own instances
- A Spotify Developer app + a Google Cloud OAuth client (instructions below)

### 2. Boot the infrastructure

```bash
# from the repo root
docker compose up -d
```

This starts Postgres on `5432` and Redis on `6379`.

### 3. Environment variables

```bash
cp .env.example .env
cp .env.example web/.env.local
cp .env.example api/.env
```

Fill in the OAuth credentials (next section). The `DATABASE_URL` and `REDIS_URL` in `.env.example` already point at the local Docker services.

### 4. Install + migrate + run

```bash
# API
cd api
npm install
npx prisma migrate dev --name init
npm run dev

# In a second terminal — web
cd web
npm install
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000
- Prisma Studio: `cd api && npm run prisma:studio`

---

## OAuth setup

### Google (sign-in)

1. https://console.cloud.google.com → create or pick a project.
2. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
3. Application type: **Web application**.
4. **Authorized redirect URIs**: `http://localhost:4000/auth/google/callback`
5. Copy the client ID and secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### Spotify (playback)

1. https://developer.spotify.com/dashboard → **Create app**.
2. **Redirect URI**: `http://localhost:4000/auth/spotify/callback`
3. Required scopes (the API requests these automatically):
   - `streaming` *(required for Web Playback SDK)*
   - `user-read-email`, `user-read-private`
   - `user-read-playback-state`, `user-modify-playback-state`
   - `user-read-currently-playing`
   - `playlist-read-private`, `user-read-recently-played`, `user-top-read`
4. Copy the client ID and secret into `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`.

> **Spotify Premium** is required to play full tracks via the Web Playback SDK. Free accounts can still chat, react, and watch the queue.

---

## How real-time sync works

The architecture is documented in `api/src/sockets/sync.ts`, but here's the short version:

1. **The server is authoritative.** Every room has a canonical `PlaybackState` `{ trackUri, isPlaying, positionMs, lastSyncAt }` cached in Redis and persisted in Postgres.
2. **Only the host (or co-host) emits playback commands.** Listeners receive `playback:state` re-broadcasts.
3. **Clients clock-sync** via `clock:ping` round-trips and track a running offset. This lets every listener compute the same `serverNow()`.
4. **Clients project the target position** from the latest authoritative state:
   ```ts
   target = positionMs + max(0, serverNow() - lastSyncAt)
   ```
   They reconcile their local Spotify SDK to that target — soft-correcting (±5% playback rate) for small drift, hard-seeking for >250ms drift.
5. **Every ~5s the server emits `playback:tick`** so anyone who's drifted self-corrects without further action from the host.
6. **Late joiners receive the full `RoomState` on `room:join`** with a projected position — they're in sync from their first frame.

Horizontal scaling: the Socket.IO **Redis adapter** is wired in so multiple API instances broadcast across the entire fleet.

---

## What's in this scaffold

### Frontend (polished showcase)
- **Landing** — animated hero with synchronized visualizer, feature grid, live-demo "world map" of listeners, testimonials marquee, CTA, footer.
- **Auth** — Google sign-in screen + 4-step animated onboarding (Spotify connect, mood picker, friends).
- **Dashboard** — featured room, stats, live rooms, friends activity, recently played, recommendations.
- **Listening Room** *(the centerpiece)* — dynamic gradient backdrop driven by album art colors, spinning album art, live progress, controls, reactions overlay (animated emoji bursts), animated visualizer, queue/chat/lyrics/people tabs, sticky chat with typing indicator and synced lyrics.
- **Discover, Friends, Profile, Settings, Join Room** — solid secondary pages.

All visuals use mock data (`web/lib/mock-data.ts`) so the showcase renders without backend credentials.

### Backend (real implementation, ready to wire up)
- **Express + helmet + cors + rate limiting + cookie auth**.
- **Google OAuth** with state validation + refresh token rotation (HttpOnly cookies, hashed in DB).
- **Spotify OAuth** with automatic access-token refresh + a search proxy.
- **Prisma schema** covering users, follows, rooms, room participants, chat, reactions, queue items, listening sessions, badges, refresh tokens.
- **Socket.IO** with Redis adapter for multi-instance pub/sub. Strongly-typed event contract in `sockets/events.ts`.
- **Sync engine** with Postgres-backed canonical state, Redis hot cache, periodic ticks, host-only authority.

### Stubbed for v1 (TODOs left in code/UI)
The advanced feature surface from the brief is intentionally **wired in the UI but not fully implemented**:
- AI playlist recommendations (Discover page has a placeholder card)
- Listening recaps / weekly insights
- Vote-skip + queue voting
- Achievements + streaks (the model exists, awarding logic doesn't yet)
- Party Mode visualizers
- Crossfade transitions
- Synced lyrics provider (the UI uses static lines — wire to Musixmatch / Genius)

Search for `TODO` in the codebase to see the exact extension points.

---

## Production checklist

Before you ship, harden:

- [ ] Replace `JWT_SECRET` / `JWT_REFRESH_SECRET` with high-entropy values stored in a secrets manager.
- [ ] Configure `WEB_ORIGIN` + cookie `secure: true` for HTTPS in prod (already conditional on `NODE_ENV`).
- [ ] Add Sentry / OpenTelemetry to `api/src/index.ts`.
- [ ] Move the `playback:tick` interval into a worker (currently in-process) so the API node can be cheaply scaled.
- [ ] Add CSRF protection on cookie-auth endpoints (`/auth/refresh`, `/auth/logout`).
- [ ] Run `npm audit` and pin major versions before deploy.
- [ ] Wire input sanitization on chat (`text` is currently rendered as React text — safe — but you'll want a profanity / spam layer for public rooms).
- [ ] Rate-limit `reaction:fire` and `chat:send` at the socket layer (currently relies on Express limiter only).
- [ ] Persist Spotify refresh tokens encrypted at rest (KMS / `pgcrypto`).
- [ ] Add a `/health` deeper check (Redis + DB pings) for load balancer probes.

---

## Deployment notes

**Web (Next.js)** → Vercel is the lowest-friction host. Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` to your API host.

**API (Express + Socket.IO)** → Railway, Fly.io, or AWS App Runner all work. Socket.IO needs sticky sessions if you scale horizontally **without** the Redis adapter — but the adapter is already configured, so you can run stateless replicas behind a normal load balancer.

**Postgres** → Neon, Supabase, RDS, or your platform's managed Postgres.

**Redis** → Upstash, Redis Cloud, or ElastiCache.

A single Dockerfile per app is included; both build with multi-stage caching.

---

## Design system

- **Surfaces:** Glassmorphism over a deep ink (`#06070C`) base with floating brand gradients (neon green `#1DF5A4` → blue `#3B82F6` → purple `#A855F7`).
- **Typography:** Inter via `next/font`, tracking-tight, large display sizes for headlines.
- **Motion:** Framer Motion for entrance + tab transitions, CSS keyframes for ambient (floating gradients, marquee, slow album-art spin), and a custom CSS-only audio visualizer.
- **Components:** All in `web/components/ui/` and `web/components/shared/` — reuse `<Button>`, `<GlassCard>`, `<Avatar>`, `<AlbumArt>`, `<Visualizer>`.

Theming is centralized in `web/tailwind.config.ts` + `web/app/globals.css`.

---

## License

Proprietary scaffold — adjust before publishing.
