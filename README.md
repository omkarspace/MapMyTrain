# MapMyTrain

> Real-time Indian Railways spatial tracking — see trains moving on actual physical tracks instead of reading static delay tables.

[![License](https://img.shields.io/badge/License-ODbL_1.0-blue.svg)](https://opendatacommons.org/licenses/odbl/1-0/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB.svg)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000.svg)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688.svg)](https://fastapi.tiangolo.com/)
[![PostGIS](https://img.shields.io/badge/PostGIS-3.4-4A90D9.svg)](https://postgis.net/)
[![Redis](https://img.shields.io/badge/Redis-7.2-DC382D.svg)](https://redis.io/)

A next-generation open-core platform that renders Indian Railways train positions on a hardware-accelerated WebGL map canvas using real-time telemetry, LERP interpolation, and binary WebSocket streaming.

**Keywords**: `Indian Railways` `train tracking` `live train status` `real-time train map` `train delay status` `railway map India` `open source train tracker` `NTES API` `PostGIS` `MapLibre` `WebGL` `WebSocket` `FastAPI` `Next.js`

---

## Features

| Feature | Description |
|---------|-------------|
| Live Train Tracking | Real-time train positions rendered as directional arrows on MapLibre WebGL canvas |
| Binary WebSocket Streaming | 16-byte frames `[TrainID:4][Lng:4][Lat:4][Bearing:2][Delay:2]` for 60 FPS performance |
| LERP Interpolation | Smooth intermediate positions when upstream updates lag |
| Route Search | Search trains by number, name, or between two stations with date picker |
| Train Drawer | Click any train to see timetable, next stop, current position, and delay status |
| NTES Scraper | 62 User-Agent rotation, cookie handshake, 3 fallback endpoints, exponential backoff |
| 3D Terrain Layer | Topographic DEM terrain visualization (premium) |
| Velocity & Delay Analytics | Trend charts for train performance (premium) |
| WhatsApp/Push Alerts | Arrival notifications with offline caching (premium) |
| Offline Mode | IndexedDB cache for cellular fallback (premium) |

---

## How It Works

```
Search Train ──► Backend Ingestion ──► NTES Scraper ──► Redis Cache
                                                              │
                                                    ┌─────────┴─────────┐
                                                    │  WebSocket Binary  │
                                                    │  16-byte frames    │
                                                    └─────────┬─────────┘
                                                              │
                                                    ┌─────────┴─────────┐
                                                    │   MapLibre WebGL   │
                                                    │   Train Markers    │
                                                    │   (60 FPS canvas)  │
                                                    └───────────────────┘
```

1. **Ingestion**: Worker scrapes NTES API every 120s with rate limiting and fallback endpoints
2. **Caching**: Raw telemetry stored in Redis with 2-minute active / 30-minute inactive TTL
3. **Streaming**: Binary WebSocket frames broadcast to all connected clients via Redis Pub/Sub
4. **Rendering**: MapLibre WebGL canvas decodes binary frames and renders directional train markers

---

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js v20+ (for local dev only)
- Python 3.12+ (for local dev only)

### 1. Clone and start

```bash
git clone https://github.com/omkarspace/MapMyTrain.git
cd MapMyTrain
cp .env.example .env
docker compose up -d
```

### 2. Run database migrations

```bash
docker exec -i mmt-postgis-db psql -U mmt_admin -d mapmytrain < backend/migrations/001_create_stations.sql
docker exec -i mmt-postgis-db psql -U mmt_admin -d mapmytrain < backend/migrations/002_create_tracks.sql
docker exec -i mmt-postgis-db psql -U mmt_admin -d mapmytrain < backend/migrations/003_create_trains.sql
docker exec -i mmt-postgis-db psql -U mmt_admin -d mapmytrain < backend/migrations/004_create_telemetry_logs.sql
docker exec -i mmt-postgis-db psql -U mmt_admin -d mapmytrain < backend/migrations/005_create_indexes.sql
docker exec -i mmt-postgis-db psql -U mmt_admin -d mapmytrain < backend/migrations/006_create_users.sql
```

### 3. Open the app

Navigate to [http://localhost:3000](http://localhost:3000)

| Service | Port | Description |
|---------|------|-------------|
| `frontend` | 3000 | Next.js WebGL app |
| `backend` | 8000 | FastAPI + WebSocket |
| `db` | 5432 | PostGIS spatial database |
| `redis` | 6379 | Cache & pub/sub |
| `tileserver` | 8080 | Vector tile server |

---

## Use Cases

| Persona | Problem | Solution |
|---------|---------|----------|
| **Daily Commuter** | Can't tell if train is stuck at signal or approaching platform | Visually inspect exact train position relative to station outer signals |
| **Long-Distance Traveler** | No geographical context during 24-hour journey | See terrain (ghats, rivers, tunnels) in real-time 3D mode |
| **Rail Enthusiast** | Text-only tools lack visual context | Track multiple trains simultaneously on interactive map |
| **Developer / Contributor** | Want to build on open railway data | Self-host full stack, extend APIs, contribute to open-core engine |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                       │
│  MapCanvas ─ TrackLayer ─ TrainMarker ─ SearchBar ─ Drawer     │
│       │                                        │                │
│       └──── WebSocket Provider (binary) ───────┘                │
└──────────────────────────┬──────────────────────────────────────┘
                           │ WebSocket / REST
┌──────────────────────────┴──────────────────────────────────────┐
│                     Backend (FastAPI)                            │
│  /trains  /stations  /stream (WS)                               │
│       │         │              │                                 │
│  CacheService  Broadcaster  IngestionWorker                     │
│       │         │              │                                 │
│       └──── Redis (pub/sub + token bucket) ──┘                  │
│                       │                                          │
│               NTES Scraper (62 UAs, cookie handshake,          │
│               3 fallback endpoints, exponential backoff)        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│              PostgreSQL 16 + PostGIS 3.4                        │
│  stations | tracks | trains | train_telemetry_logs | users      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, MapLibre GL JS, TypeScript, Tailwind CSS |
| Backend | FastAPI, asyncpg, Redis, httpx |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| Cache | Redis 7.2 (token bucket rate limiter) |
| Tile Server | MapLibre TileServer GL |
| Ingestion | NTES API scraper with 62 User-Agent rotation, cookie handshake, 3 fallback endpoints |

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/v1/trains/` | List trains (paginated) |
| `GET` | `/api/v1/trains/{number}` | Get train by number |
| `GET` | `/api/v1/trains/search/{query}` | Search trains |
| `GET` | `/api/v1/stations/` | List stations (paginated) |
| `GET` | `/api/v1/stations/{code}` | Get station by code |
| `WS` | `/api/v1/stream` | Binary train position stream |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://mmt_user:dev_password@localhost:5432/mapmytrain_dev` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection string |
| `DEVELOPMENT_MOCK_MODE` | `true` | Enable mock data (no NTES scraping) |
| `INGESTION_INTERVAL_SECONDS` | `120` | Seconds between scraper cycles |
| `NEXT_PUBLIC_USE_MOCK_TELEMETRY` | `false` | Use mock train data on frontend |
| `NEXT_PUBLIC_BACKEND_WS_URL` | `ws://localhost:8000/api/v1/stream` | WebSocket endpoint |
| `NEXT_PUBLIC_TILE_SERVER_URL` | `http://localhost:8080` | Vector tile server URL |

---

## Project Structure

```
MapMyTrain/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app with lifespan
│   │   ├── config.py            # Pydantic v2 settings
│   │   ├── database.py          # asyncpg connection pool
│   │   ├── models/              # Dataclasses (Station, Track, Train)
│   │   ├── schemas/             # Pydantic models + binary protocol
│   │   ├── routers/             # REST + WebSocket endpoints
│   │   ├── services/            # Cache, broadcaster, interpolation, rate limiter
│   │   └── ingestion/           # NTES scraper, parser, worker
│   ├── migrations/              # SQL schema files (001-006)
│   ├── tests/                   # pytest test suite
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/                     # Next.js App Router
│   ├── components/
│   │   ├── map/                 # MapCanvas, TrackLayer, TrainMarker, TerrainLayer
│   │   ├── ui/                  # SearchBar, TrainDrawer, TrainAnalytics, StatusBar
│   │   └── MapViewController.tsx
│   ├── hooks/                   # useWebSocket, useMapInteractions
│   ├── providers/               # WebSocketProvider
│   ├── lib/                     # types.ts, constants.ts
│   ├── __tests__/               # Frontend test suite
│   └── Dockerfile
├── scripts/                     # Seed script, ODbL export
├── docker-compose.yml           # Production stack (5 services)
├── docker-compose.dev.yml       # Dev-only (PostGIS + Redis)
└── .env.example
```

---

## Performance

| Metric | Value | Notes |
|--------|-------|-------|
| WebSocket frame size | 16 bytes | Binary encoding, no JSON overhead |
| Target FPS | 60 | WebGL canvas rendering |
| LERP interpolation | Per-frame | Smooth movement between updates |
| Ingestion cycle | 120s | Configurable via `INGESTION_INTERVAL_SECONDS` |
| Redis cache TTL | 120s active / 30min inactive | Automatic expiry |
| Rate limiter | 5 tokens, 1/sec refill | Redis token bucket |
| Telemetry cleanup | Hourly | Deletes logs older than 48 hours |

---

## Roadmap

- [x] PostGIS schema with spatial indexes
- [x] FastAPI backend with asyncpg connection pool
- [x] Redis cache with token bucket rate limiter
- [x] Binary WebSocket streaming (16-byte frames)
- [x] MapLibre WebGL canvas with track layers
- [x] NTES scraper with 62 User-Agents and 3 fallback endpoints
- [x] SearchBar with debounced auto-suggest
- [x] TrainDrawer with timetable and next stop
- [x] Docker Compose production stack (5 services)
- [x] ODbL compliance export scripts
- [ ] User authentication (Firebase)
- [ ] Stripe billing integration
- [ ] WhatsApp alert routing
- [ ] Mobile app (React Native)
- [ ] Multi-language support (Hindi, Tamil, Bengali)

---

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start PostGIS + Redis
docker compose -f docker-compose.dev.yml up -d

# Run migrations
psql -U mmt_user -d mapmytrain_dev < migrations/001_create_stations.sql
# ... (repeat for each migration)

# Start the server
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Run Tests

```bash
# Backend
cd backend && python -m pytest tests/ -v

# Frontend lint
cd frontend && npm run lint
```

---

## FAQ

### What is MapMyTrain?

MapMyTrain is a real-time Indian Railways spatial tracking platform. It renders live train positions on an interactive WebGL map canvas, replacing text-based delay tables with visual geographic context.

### How does MapMyTrain get train data?

The backend ingester scrapes the NTES (National Train Enquiry System) API every 120 seconds using 62 rotating User-Agent strings, cookie handshakes, and 3 fallback endpoints. Raw telemetry is cached in Redis and broadcast to clients via binary WebSocket frames.

### What is the binary WebSocket protocol?

Train positions are streamed as 16-byte binary frames: `[TrainID:4][Lng:4][Lat:4][Bearing:2][Delay:2]`. This is 97% smaller than JSON, enabling 60 FPS rendering on low-end devices.

### How does LERP interpolation work?

Between NTES updates, the frontend uses Linear Interpolation (LERP): `P_current = P_start + f × (P_end - P_start)` where `f = T_elapsed / T_total`. This generates smooth intermediate positions so trains appear to move continuously.

### Is MapMyTrain free to use?

The core engine is open-source under the ODbL license. Premium features (3D terrain, velocity analytics, WhatsApp alerts, offline mode) require a subscription.

### Can I self-host MapMyTrain?

Yes. The entire stack runs via Docker Compose: `docker compose up -d`. You need PostGIS, Redis, a tile server, the FastAPI backend, and the Next.js frontend. See the Quick Start section above.

### What technologies does MapMyTrain use?

**Frontend**: Next.js 16, React 19, MapLibre GL JS, TypeScript, Tailwind CSS. **Backend**: FastAPI, asyncpg, Redis, httpx. **Database**: PostgreSQL 16 + PostGIS 3.4. **Cache**: Redis 7.2 with token bucket rate limiter.

### How do I contribute?

See [CONTRIBUTING.md](CONTRIBUTING.md). Quick steps: fork the repo, create a feature branch, run tests (`cd backend && python -m pytest tests/ -v`), run lint (`cd frontend && npm run lint`), and submit a PR.

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for full setup instructions.

**Quick guide:**

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Run tests: `cd backend && python -m pytest tests/ -v`
4. Run lint: `cd frontend && npm run lint`
5. Submit a PR with a clear description

We respond to all PRs within 48 hours.

---

## License

Open-core: core engine is open source under the [Open Database License (ODbL) v1.0](https://opendatacommons.org/licenses/odbl/1-0/). Premium features (3D terrain, analytics, alerts, offline mode) are proprietary.

Data sourced from [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
