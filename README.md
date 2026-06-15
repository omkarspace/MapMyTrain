# MapMyTrain

Real-time spatial tracking platform for Indian Railways. See trains moving along actual physical tracks on a hardware-accelerated 3D map canvas instead of reading static delay tables.

## Features

- **Live Train Tracking** — Real-time train positions rendered as directional arrows on MapLibre WebGL canvas
- **Binary WebSocket Streaming** — 16-byte frames `[TrainID:4][Lng:4][Lat:4][Bearing:2][Delay:2]` for 60 FPS performance
- **LERP Interpolation** — Smooth intermediate positions when upstream updates lag
- **Route Search** — Search trains by number, name, or between two stations with date picker
- **Train Drawer** — Click any train to see timetable, next stop, current position, and delay status
- **3D Terrain Layer** — Topographic DEM terrain visualization (premium)
- **Velocity & Delay Analytics** — Trend charts for train performance (premium)
- **WhatsApp/Push Alerts** — Arrival notifications with offline caching (premium)
- **Offline Mode** — IndexedDB cache for cellular fallback (premium)
- **ODbL Compliant** — OpenStreetMap attribution and data export scripts

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, MapLibre GL JS, TypeScript, Tailwind CSS |
| Backend | FastAPI, asyncpg, Redis, httpx |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| Cache | Redis 7.2 (token bucket rate limiter) |
| Tile Server | MapLibre TileServer GL |
| Ingestion | NTES API scraper with 62 User-Agent rotation, cookie handshake, 3 fallback endpoints |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js v20+ (for local dev)
- Python 3.12+ (for local dev)

### 1. Clone and configure

```bash
git clone https://github.com/omkarspace/MapMyTrain.git
cd MapMyTrain
cp .env.example .env
```

### 2. Start the full stack

```bash
docker compose up -d
```

This starts 5 services:

| Service | Port | Description |
|---------|------|-------------|
| `db` | 5432 | PostGIS spatial database |
| `redis` | 6379 | Cache & pub/sub |
| `tileserver` | 8080 | Vector tile server |
| `backend` | 8000 | FastAPI + WebSocket |
| `frontend` | 3000 | Next.js app |

### 3. Run database migrations

```bash
docker exec -i mmt-postgis-db psql -U mmt_admin -d mapmytrain < backend/migrations/001_create_stations.sql
docker exec -i mmt-postgis-db psql -U mmt_admin -d mapmytrain < backend/migrations/002_create_tracks.sql
docker exec -i mmt-postgis-db psql -U mmt_admin -d mapmytrain < backend/migrations/003_create_trains.sql
docker exec -i mmt-postgis-db psql -U mmt_admin -d mapmytrain < backend/migrations/004_create_telemetry_logs.sql
docker exec -i mmt-postgis-db psql -U mmt_admin -d mapmytrain < backend/migrations/005_create_indexes.sql
docker exec -i mmt-postgis-db psql -U mmt_admin -d mapmytrain < backend/migrations/006_create_users.sql
```

### 4. Seed spatial assets (optional)

```bash
docker exec -it mmt-fastapi-backend python -m scripts.seed_spatial_assets
```

### 5. Open the app

Navigate to [http://localhost:3000](http://localhost:3000)

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

Open [http://localhost:3000](http://localhost:3000)

### Run Tests

```bash
# Backend
cd backend && python -m pytest tests/ -v

# Frontend lint
cd frontend && npm run lint
```

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

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/v1/trains/` | List trains (paginated) |
| `GET` | `/api/v1/trains/{number}` | Get train by number |
| `GET` | `/api/v1/trains/search/{query}` | Search trains |
| `GET` | `/api/v1/stations/` | List stations (paginated) |
| `GET` | `/api/v1/stations/{code}` | Get station by code |
| `WS` | `/api/v1/stream` | Binary train position stream |

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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, branching strategy, and PR checklist.

## License

Open-core: core engine is open source under ODbL-compliant data policies. Premium features (3D terrain, analytics, alerts, offline mode) are proprietary.

Data sourced from [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
