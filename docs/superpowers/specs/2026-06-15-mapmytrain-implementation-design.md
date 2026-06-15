# MapMyTrain Implementation Design

**Date:** 2026-06-15  
**Status:** Approved  
**Approach:** Phased Monorepo → Split  

---

## 1. Overview

MapMyTrain is a real-time spatial tracking platform for Indian Railways. Built with Next.js 14 + MapLibre WebGL frontend, FastAPI backend, PostgreSQL + PostGIS database, Redis cache, and vector tile server.

**Goal:** Full stack with real data, including ingestion/scraping layer.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  Next.js 14 (App Router) + MapLibre GL JS WebGL Canvas     │
│  Port: 3000                                                 │
└─────────────────────────┬───────────────────────────────────┘
                          │ WebSocket (binary protobuf)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                              │
│  FastAPI + Celery Workers + Ingestion Scraper               │
│  Port: 8000                                                 │
└───────┬─────────────────┬─────────────────┬─────────────────┘
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  PostgreSQL  │  │    Redis     │  │  TileServer  │
│  + PostGIS   │  │  7.2 Alpine  │  │  GL v4.11.0  │
│  Port: 5432  │  │  Port: 6379  │  │  Port: 8080  │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 3. Frontend Structure

```
frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── map/
│   │   ├── MapCanvas.tsx        # Core WebGL viewport (useRef for state)
│   │   ├── TrainMarker.tsx      # Rotated arrow with bearing
│   │   └── TrackLayer.tsx       # Vector track lines
│   ├── ui/
│   │   ├── SearchBar.tsx        # Train number/name search
│   │   ├── TrainDrawer.tsx      # Bottom sheet with train details
│   │   └── StatusBar.tsx        # ODbL attribution
│   └── providers/
│       └── WebSocketProvider.tsx # Real-time updates context
├── hooks/
│   ├── useWebSocket.ts
│   └── useMapInteractions.ts
├── lib/
│   ├── types.ts
│   └── constants.ts
└── public/
    └── data/mock_trains.json
```

### Key Components

- **MapCanvas.tsx**: Uses `useRef` for map state to avoid re-renders. Renders vector tracks + train markers via MapLibre GL JS.
- **WebSocketProvider.tsx**: Context provider for real-time train updates. Decodes binary packets. Falls back to mock data when `NEXT_PUBLIC_USE_MOCK_TELEMETRY=true`.
- **TrainDrawer.tsx**: Bottom sheet with train details. Sandboxed touch to prevent map pan conflicts.

---

## 4. Backend Structure

```
backend/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── dependencies.py
│   ├── models/
│   │   ├── station.py
│   │   ├── track.py
│   │   └── train.py
│   ├── schemas/
│   │   ├── train.py
│   │   └── websocket.py
│   ├── routers/
│   │   ├── trains.py
│   │   ├── stations.py
│   │   └── ws.py
│   ├── services/
│   │   ├── interpolation.py    # LERP math
│   │   ├── cache.py            # Redis wrapper
│   │   └── broadcaster.py      # Redis Pub/Sub → WebSocket
│   └── ingestion/
│       ├── worker.py           # Celery/asyncio background loop
│       ├── scraper.py          # NTES API consumer
│       └── parser.py           # Response parser
├── alembic/
├── tests/
├── requirements.txt
└── Dockerfile
```

### Key Services

- **interpolation.py**: `P_current = P_start + f × (P_end - P_start)`. PostGIS `ST_LineInterpolatePoint` for curved tracks.
- **broadcaster.py**: Redis Pub/Sub → WebSocket fan-out. Binary encoding: [TrainID:4][Lng:4][Lat:4][Bearing:2][Delay:2] = 16 bytes.
- **scraper.py**: NTES API with header rotation, cookie handshake, rate limiting via Redis token bucket.
- **cache.py**: Redis wrapper: `train:{id}:raw` (120s TTL), inactive trains (30min TTL).

---

## 5. Database Schema

### Tables

| Table | Primary Key | Key Columns |
|-------|-------------|-------------|
| `users` | `id: UUID` | email, firebase_uid, tier |
| `stations` | `station_code: VARCHAR(10)` | station_name, geom (Point, 4326) |
| `tracks` | `id: SERIAL` | osm_id, gauge, geom (LineString, 4326) |
| `trains` | `train_number: VARCHAR(10)` | train_name, source/dest FK, runs_on_days |
| `train_telemetry_logs` | `id: BIGSERIAL` | train_number FK, current_location, delay, bearing |

### Relationships

- `trains.source_station_code` → `stations.station_code` (RESTRICT)
- `trains.destination_station_code` → `stations.station_code` (RESTRICT)
- `train_telemetry_logs.train_number` → `trains.train_number` (CASCADE)
- `train_telemetry_logs.last_station_code` → `stations.station_code` (SET NULL)

### Spatial Indexes (GiST)

```sql
CREATE INDEX idx_stations_geom ON stations USING GIST (geom);
CREATE INDEX idx_tracks_geom ON tracks USING GIST (geom);
CREATE INDEX idx_telemetry_geom ON train_telemetry_logs USING GIST (current_location);
```

### Cleanup Trigger

```sql
-- Delete telemetry older than 48 hours
DELETE FROM train_telemetry_logs WHERE captured_at < NOW() - INTERVAL '48 hours';
```

---

## 6. Data Flow

```
NTES/Scrapers → Ingestion Worker → Redis Cache (120s TTL)
                                         ↓
                                    PostGIS (LERP)
                                         ↓
                                    Redis Pub/Sub
                                         ↓
                                   WebSocket Server
                                         ↓
                                   MapLibre Canvas
```

### WebSocket Binary Protocol (16 bytes)

| Field | Type | Size | Description |
|-------|------|------|-------------|
| Train ID | Int32 | 4 | 5-digit identifier |
| Longitude | Float32 | 4 | X coordinate |
| Latitude | Float32 | 4 | Y coordinate |
| Bearing | Int16 | 2 | 0° to 359° |
| Delay | Int16 | 2 | Minutes |

---

## 7. Docker Compose Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| db | postgis/postgis:16-3.4 | 5432 | Spatial database |
| redis | redis:7.2-alpine | 6379 | Cache + Pub/Sub |
| tileserver | maplibre/tileserver-gl:v4.11.0 | 8080 | Vector tiles |
| backend | Custom FastAPI | 8000 | API + WebSocket |
| frontend | Custom Next.js | 3000 | Client app |

---

## 8. Mock Mode

When `NEXT_PUBLIC_USE_MOCK_TELEMETRY=true`:
- Frontend ignores WebSocket connections
- Loads static `mock_trains.json` with predefined routes
- Loops mock trains along track shapes
- No backend required for local development

---

## 9. ODbL Compliance

- Attribution: `© OpenStreetMap contributors` fixed to map canvas
- Derivative databases (modified tracks) stay in public repo
- Live telemetry kept separate, joined only at runtime via `ST_DWeekly`
- Weekly export script for public track data

---

## 10. Implementation Order

1. **Phase 1: Database + Backend Core** (Week 1-2)
   - PostgreSQL + PostGIS setup
   - FastAPI with REST endpoints
   - Redis caching layer
   - Basic ingestion worker

2. **Phase 2: Frontend + MapLibre** (Week 2-3)
   - Next.js 14 setup
   - MapLibre WebGL canvas
   - Track + station rendering
   - WebSocket integration

3. **Phase 3: Real-Time Streaming** (Week 3-4)
   - Binary protobuf encoding
   - Redis Pub/Sub broadcaster
   - Live train marker updates
   - LERP interpolation

4. **Phase 4: Ingestion + Polish** (Week 4-5)
   - NTES scraper with rate limiting
   - Error handling + fallbacks
   - Mock mode toggle
   - ODbL compliance

5. **Phase 5: Split to Dual-Repo** (Week 5-6)
   - Extract public core
   - Setup submodule in private repo
   - Premium override pattern
