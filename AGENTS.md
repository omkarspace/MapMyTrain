# MapMyTrain - Repository Overview

> This file provides structured context for AI coding assistants (GitHub Copilot, Cursor, Claude, GPT).
> It describes the repository's purpose, architecture, conventions, and constraints.

## Project Summary

**MapMyTrain** is a real-time Indian Railways spatial tracking platform. It renders live train positions on a hardware-accelerated WebGL map canvas using binary WebSocket streaming, LERP interpolation, and PostGIS spatial queries.

**Stack**: Next.js 16 + MapLibre GL JS (frontend) | FastAPI + asyncpg (backend) | PostgreSQL 16 + PostGIS 3.4 | Redis 7.2

## Architecture

```
Frontend (Next.js 16)  →  WebSocket (binary)  →  Backend (FastAPI)  →  NTES Scraper
         ↓                                              ↓                    ↓
   MapLibre WebGL                              Redis Cache            PostgreSQL + PostGIS
   (60 FPS canvas)                         (token bucket)            (spatial indexes)
```

## Directory Structure

| Path | Purpose |
|------|---------|
| `frontend/app/` | Next.js App Router pages and layouts |
| `frontend/components/map/` | MapCanvas, TrackLayer, TrainMarker, TerrainLayer |
| `frontend/components/ui/` | SearchBar, TrainDrawer, TrainAnalytics, StatusBar |
| `frontend/hooks/` | useWebSocket (binary parser), useMapInteractions |
| `frontend/providers/` | WebSocketProvider (context for train positions) |
| `frontend/lib/` | types.ts (Train, Station, TrainPosition), constants.ts |
| `backend/app/main.py` | FastAPI app with lifespan (db, redis, cache, ingestion, cleanup) |
| `backend/app/config.py` | Pydantic v2 settings (DATABASE_URL, REDIS_URL, MOCK_MODE) |
| `backend/app/database.py` | asyncpg connection pool manager |
| `backend/app/routers/` | REST endpoints (trains, stations) + WebSocket /stream |
| `backend/app/services/` | CacheService, Broadcaster, interpolation, rate_limiter |
| `backend/app/ingestion/` | NTES scraper (62 UAs), parser (regex + BeautifulSoup fallback), worker |
| `backend/migrations/` | SQL schema files (001-006) |
| `backend/tests/` | pytest test suite (17 tests) |

## Key Conventions

### TypeScript
- **No `any` types** — all spatial payloads map to explicit interfaces
- Use `useRef` for map viewport state, not `useState` (prevents WebGL re-init)
- Train positions use `Train` interface (not `TrainInfo`)

### Python
- **asyncpg** for database — no ORM, raw SQL with parameterized queries
- **Pydantic v2** for settings and schemas
- Binary protocol: 16-byte frames `[TrainID:4][Lng:4][Lat:4][Bearing:2][Delay:2]`

### Docker
- 5-service stack: db (PostGIS), redis, tileserver, backend, frontend
- Log rotation: json-file driver, 10m max-size, 3 files
- Health checks on db and redis services

## Data Flow

1. **Ingestion**: `worker.py` scrapes NTES API every 120s with 62 User-Agent rotation
2. **Caching**: Raw telemetry in Redis (120s active TTL, 30min inactive)
3. **Broadcasting**: Redis Pub/Sub → WebSocket binary frames
4. **Rendering**: MapLibre GL JS decodes binary → directional SVG train markers

## Common Tasks

### Adding a new API endpoint
1. Create route in `backend/app/routers/`
2. Add Pydantic model in `backend/app/schemas/`
3. Register in `backend/app/main.py` via `app.include_router()`

### Adding a new frontend component
1. Create in `frontend/components/map/` or `frontend/components/ui/`
2. Use `useMap()` from `MapContext` for map access
3. Import types from `frontend/lib/types.ts`

### Running tests
```bash
# Backend
cd backend && python -m pytest tests/ -v

# Frontend lint
cd frontend && npm run lint
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `DEVELOPMENT_MOCK_MODE` | Enable mock data (default: true) |
| `INGESTION_INTERVAL_SECONDS` | Scraper cycle interval (default: 120) |
| `NEXT_PUBLIC_USE_MOCK_TELEMETRY` | Use mock train data on frontend |
| `NEXT_PUBLIC_BACKEND_WS_URL` | WebSocket endpoint URL |
| `NEXT_PUBLIC_TILE_SERVER_URL` | Vector tile server URL |

## Constraints

- Monorepo only — do not split into separate repos
- ODbL compliance required — live telemetry separate from OSM track data
- 60 FPS target — avoid unnecessary re-renders, use refs for map state
- Binary WebSocket — no JSON for train positions (16-byte frames only)
