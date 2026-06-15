# MapMyTrain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time Indian Railways tracking platform with Next.js 14 + MapLibre WebGL frontend, FastAPI backend, PostgreSQL + PostGIS, Redis cache, and vector tile server.

**Architecture:** Monorepo with phased extraction to dual-repo. Event-driven ingestion from NTES scrapers → Redis cache → PostGIS LERP → WebSocket → MapLibre canvas. Binary protobuf streaming for 60 FPS performance.

**Tech Stack:** Next.js 14, MapLibre GL JS, FastAPI, asyncpg, PostgreSQL 16 + PostGIS 3.4, Redis 7.2, Celery, Docker Compose

---

## File Structure

```
map-my-train/
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── map/
│   │   │   ├── MapCanvas.tsx
│   │   │   ├── TrainMarker.tsx
│   │   │   └── TrackLayer.tsx
│   │   ├── ui/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── TrainDrawer.tsx
│   │   │   └── StatusBar.tsx
│   │   └── providers/
│   │       └── WebSocketProvider.tsx
│   ├── hooks/
│   │   ├── useWebSocket.ts
│   │   └── useMapInteractions.ts
│   ├── lib/
│   │   ├── types.ts
│   │   └── constants.ts
│   └── public/
│       └── data/mock_trains.json
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py ✅
│   │   ├── database.py ✅
│   │   ├── dependencies.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── station.py
│   │   │   ├── track.py
│   │   │   └── train.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── train.py
│   │   │   └── websocket.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── trains.py
│   │   │   ├── stations.py
│   │   │   └── ws.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── interpolation.py
│   │   │   ├── cache.py
│   │   │   └── broadcaster.py
│   │   └── ingestion/
│   │       ├── __init__.py
│   │       ├── worker.py
│   │       ├── scraper.py
│   │       └── parser.py
│   ├── migrations/
│   │   ├── 001_create_stations.sql
│   │   ├── 002_create_tracks.sql
│   │   ├── 003_create_trains.sql
│   │   ├── 004_create_telemetry_logs.sql
│   │   └── 005_create_indexes.sql
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py
│   │   ├── test_config.py
│   │   ├── test_database.py
│   │   ├── test_interpolation.py
│   │   └── test_cache.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env ✅
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
└── README.md
```

---

## Task 1: PostGIS Schema Migrations

**Files:**
- Create: `backend/migrations/001_create_stations.sql`
- Create: `backend/migrations/002_create_tracks.sql`
- Create: `backend/migrations/003_create_trains.sql`
- Create: `backend/migrations/004_create_telemetry_logs.sql`
- Create: `backend/migrations/005_create_indexes.sql`

- [ ] **Step 1: Create stations table**

```sql
-- backend/migrations/001_create_stations.sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE stations (
    station_code VARCHAR(10) PRIMARY KEY,
    station_name VARCHAR(150) NOT NULL,
    division VARCHAR(50),
    zone VARCHAR(10),
    geom GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 2: Create tracks table**

```sql
-- backend/migrations/002_create_tracks.sql
CREATE TABLE tracks (
    id SERIAL PRIMARY KEY,
    osm_id BIGINT UNIQUE,
    gauge VARCHAR(20) DEFAULT 'broad' CHECK (gauge IN ('broad', 'meter', 'narrow')),
    electrified BOOLEAN DEFAULT TRUE,
    tracks_count INT DEFAULT 2,
    geom GEOMETRY(LineString, 4326) NOT NULL
);
```

- [ ] **Step 3: Create trains table**

```sql
-- backend/migrations/003_create_trains.sql
CREATE TABLE trains (
    train_number VARCHAR(10) PRIMARY KEY,
    train_name VARCHAR(150) NOT NULL,
    source_station_code VARCHAR(10) REFERENCES stations(station_code),
    destination_station_code VARCHAR(10) REFERENCES stations(station_code),
    runs_on_days VARCHAR(7) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 4: Create telemetry_logs table**

```sql
-- backend/migrations/004_create_telemetry_logs.sql
CREATE TABLE train_telemetry_logs (
    id BIGSERIAL PRIMARY KEY,
    train_number VARCHAR(10) REFERENCES trains(train_number) ON DELETE CASCADE,
    last_station_code VARCHAR(10) REFERENCES stations(station_code) ON DELETE SET NULL,
    next_station_code VARCHAR(10) REFERENCES stations(station_code) ON DELETE SET NULL,
    delay_minutes INT DEFAULT 0,
    bearing INT CHECK (bearing BETWEEN 0 AND 359),
    current_location GEOMETRY(Point, 4326),
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

- [ ] **Step 5: Create spatial indexes**

```sql
-- backend/migrations/005_create_indexes.sql
CREATE INDEX idx_stations_geom ON stations USING GIST (geom);
CREATE INDEX idx_tracks_geom ON tracks USING GIST (geom);
CREATE INDEX idx_telemetry_geom ON train_telemetry_logs USING GIST (current_location);
CREATE INDEX idx_trains_lookup ON trains (train_number, train_name);
CREATE INDEX idx_telemetry_time_series ON train_telemetry_logs (train_number, captured_at DESC);
```

- [ ] **Step 6: Create cleanup function**

```sql
-- Add to 005_create_indexes.sql
CREATE OR REPLACE FUNCTION clean_expired_telemetry()
RETURNS void AS $$
BEGIN
    DELETE FROM train_telemetry_logs 
    WHERE captured_at < NOW() - INTERVAL '48 hours';
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 7: Commit**

```bash
git add backend/migrations/
git commit -m "feat: add PostGIS schema migrations for stations, tracks, trains, telemetry"
```

---

## Task 2: Backend Dependencies & Docker Setup

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/Dockerfile`
- Create: `docker-compose.yml`
- Create: `docker-compose.dev.yml`
- Create: `.env.example`

- [ ] **Step 1: Create requirements.txt**

```txt
# backend/requirements.txt
fastapi==0.115.0
uvicorn[standard]==0.32.0
asyncpg==0.30.0
redis[hiredis]==5.2.0
pydantic==2.10.0
pydantic-settings==2.7.0
celery==5.4.0
httpx==0.28.0
python-dotenv==1.0.1
pytest==8.3.0
pytest-asyncio==0.25.0
```

- [ ] **Step 2: Create Dockerfile**

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 3: Create docker-compose.yml**

```yaml
# docker-compose.yml
version: '3.8'

networks:
  mapmytrain-mesh:
    driver: bridge

volumes:
  postgis_data:
  redis_data:

services:
  db:
    image: postgis/postgis:16-3.4
    container_name: mmt-postgis-db
    environment:
      POSTGRES_USER: mmt_user
      POSTGRES_PASSWORD: ${DB_PASSWORD:-dev_password}
      POSTGRES_DB: mapmytrain_dev
    ports:
      - "5432:5432"
    volumes:
      - postgis_data:/var/lib/postgresql/data
    networks:
      - mapmytrain-mesh
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mmt_user -d mapmytrain_dev"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7.2-alpine
    container_name: mmt-redis-cache
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - mapmytrain-mesh
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: mmt-fastapi-backend
    environment:
      - DATABASE_URL=postgresql://mmt_user:${DB_PASSWORD:-dev_password}@db:5432/mapmytrain_dev
      - REDIS_URL=redis://redis:6379/0
      - DEVELOPMENT_MOCK_MODE=true
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - mapmytrain-mesh
    volumes:
      - ./backend:/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- [ ] **Step 4: Create docker-compose.dev.yml**

```yaml
# docker-compose.dev.yml
version: '3.8'

networks:
  mapmytrain-mesh:
    driver: bridge

volumes:
  postgis_data:
  redis_data:

services:
  db:
    image: postgis/postgis:16-3.4
    container_name: mmt-postgis-db-dev
    environment:
      POSTGRES_USER: mmt_user
      POSTGRES_PASSWORD: dev_password
      POSTGRES_DB: mapmytrain_dev
    ports:
      - "5432:5432"
    volumes:
      - postgis_data:/var/lib/postgresql/data
    networks:
      - mapmytrain-mesh

  redis:
    image: redis:7.2-alpine
    container_name: mmt-redis-cache-dev
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - mapmytrain-mesh
```

- [ ] **Step 5: Create .env.example**

```env
# .env.example
DATABASE_URL=postgresql://mmt_user:dev_password@localhost:5432/mapmytrain_dev
REDIS_URL=redis://localhost:6379/0
DEVELOPMENT_MOCK_MODE=true
DB_PASSWORD=dev_password
```

- [ ] **Step 6: Commit**

```bash
git add backend/requirements.txt backend/Dockerfile docker-compose.yml docker-compose.dev.yml .env.example
git commit -m "feat: add Docker Compose stack with PostGIS and Redis"
```

---

## Task 3: FastAPI Main App with Lifecycle Hooks

**Files:**
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/dependencies.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_config.py`

- [ ] **Step 1: Create __init__.py files**

```python
# backend/app/__init__.py
```

```python
# backend/tests/__init__.py
```

- [ ] **Step 2: Write failing test for config**

```python
# backend/tests/test_config.py
from app.config import settings


def test_settings_has_default_database_url():
    assert "postgresql" in settings.DATABASE_URL


def test_settings_has_default_redis_url():
    assert "redis" in settings.REDIS_URL


def test_settings_mock_mode_default():
    assert settings.DEVELOPMENT_MOCK_MODE is True


def test_settings_api_prefix():
    assert settings.API_V1_STR == "/api/v1"
```

- [ ] **Step 3: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/test_config.py -v`
Expected: PASS (config.py already exists)

- [ ] **Step 4: Create dependencies.py**

```python
# backend/app/dependencies.py
from typing import AsyncGenerator
import asyncpg
from app.database import db_manager


async def get_db_connection() -> AsyncGenerator[asyncpg.Connection, None]:
    """FastAPI dependency for database connections."""
    async for conn in db_manager.get_connection():
        yield conn
```

- [ ] **Step 5: Create main.py**

```python
# backend/app/main.py
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import db_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MapMyTrain")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown events."""
    # Startup
    logger.info("Starting MapMyTrain backend...")
    await db_manager.initialize()
    logger.info("MapMyTrain backend ready.")
    yield
    # Shutdown
    logger.info("Shutting down MapMyTrain backend...")
    await db_manager.close()
    logger.info("MapMyTrain backend stopped.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.VERSION}
```

- [ ] **Step 6: Run tests**

Run: `cd backend && python -m pytest tests/ -v`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/app/__init__.py backend/app/main.py backend/app/dependencies.py backend/tests/
git commit -m "feat: add FastAPI app with lifecycle hooks and health endpoint"
```

---

## Task 4: Redis Cache Service

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/cache.py`
- Create: `backend/tests/test_cache.py`

- [ ] **Step 1: Write failing test for cache**

```python
# backend/tests/test_cache.py
import pytest
from app.services.cache import CacheService


@pytest.fixture
def cache_service():
    return CacheService()


def test_cache_service_has_redis_url(cache_service):
    assert cache_service.redis_url is not None


def test_cache_service_train_key_format(cache_service):
    key = cache_service._train_key("12301")
    assert key == "train:12301:raw"


def test_cache_service_inactive_key_format(cache_service):
    key = cache_service._inactive_key("12301")
    assert key == "train:12301:inactive"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_cache.py -v`
Expected: FAIL with "ModuleNotFoundError: No module named 'app.services.cache'"

- [ ] **Step 3: Implement cache service**

```python
# backend/app/services/__init__.py
```

```python
# backend/app/services/cache.py
import json
import logging
from typing import Any, Optional
import redis.asyncio as redis
from app.config import settings

logger = logging.getLogger("MapMyTrain.Cache")

TRAIN_TTL_SECONDS = 120
INACTIVE_TRAIN_TTL_SECONDS = 1800  # 30 minutes


class CacheService:
    def __init__(self):
        self.redis_url = settings.REDIS_URL
        self._client: Optional[redis.Redis] = None

    async def initialize(self):
        """Create Redis connection."""
        if self._client is None:
            self._client = redis.from_url(
                self.redis_url,
                decode_responses=True,
            )
            logger.info("Redis cache connection established.")

    async def close(self):
        """Close Redis connection."""
        if self._client:
            await self._client.close()
            self._client = None

    def _train_key(self, train_number: str) -> str:
        return f"train:{train_number}:raw"

    def _inactive_key(self, train_number: str) -> str:
        return f"train:{train_number}:inactive"

    async def get_train_data(self, train_number: str) -> Optional[dict]:
        """Get cached train data."""
        if not self._client:
            return None
        key = self._train_key(train_number)
        data = await self._client.get(key)
        if data:
            return json.loads(data)
        return None

    async def set_train_data(self, train_number: str, data: dict) -> None:
        """Cache train data with TTL."""
        if not self._client:
            return
        key = self._train_key(train_number)
        await self._client.setex(key, TRAIN_TTL_SECONDS, json.dumps(data))

    async def mark_inactive(self, train_number: str) -> None:
        """Mark train as inactive with longer TTL."""
        if not self._client:
            return
        key = self._inactive_key(train_number)
        await self._client.setex(key, INACTIVE_TRAIN_TTL_SECONDS, "1")

    async def is_inactive(self, train_number: str) -> bool:
        """Check if train is marked inactive."""
        if not self._client:
            return False
        key = self._inactive_key(train_number)
        return await self._client.exists(key) > 0


# Global cache instance
cache_service = CacheService()
```

- [ ] **Step 4: Run tests**

Run: `cd backend && python -m pytest tests/test_cache.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/__init__.py backend/app/services/cache.py backend/tests/test_cache.py
git commit -m "feat: add Redis cache service with train data TTL"
```

---

## Task 5: LERP Interpolation Service

**Files:**
- Create: `backend/app/services/interpolation.py`
- Create: `backend/tests/test_interpolation.py`

- [ ] **Step 1: Write failing tests for interpolation**

```python
# backend/tests/test_interpolation.py
from app.services.interpolation import calculate_lerp_fraction, interpolate_position


def test_lerp_fraction_at_start():
    fraction = calculate_lerp_fraction(elapsed=0, total=100)
    assert fraction == 0.0


def test_lerp_fraction_at_end():
    fraction = calculate_lerp_fraction(elapsed=100, total=100)
    assert fraction == 1.0


def test_lerp_fraction_midpoint():
    fraction = calculate_lerp_fraction(elapsed=50, total=100)
    assert fraction == 0.5


def test_lerp_fraction_clamped():
    fraction = calculate_lerp_fraction(elapsed=150, total=100)
    assert fraction == 1.0


def test_interpolate_position_start():
    start = (77.2090, 28.6139)  # New Delhi
    end = (80.9462, 26.8467)  # Lucknow
    pos = interpolate_position(start, end, 0.0)
    assert pos == start


def test_interpolate_position_end():
    start = (77.2090, 28.6139)
    end = (80.9462, 26.8467)
    pos = interpolate_position(start, end, 1.0)
    assert pos == end


def test_interpolate_position_midpoint():
    start = (0.0, 0.0)
    end = (10.0, 10.0)
    pos = interpolate_position(start, end, 0.5)
    assert pos == (5.0, 5.0)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_interpolation.py -v`
Expected: FAIL with "ModuleNotFoundError: No module named 'app.services.interpolation'"

- [ ] **Step 3: Implement interpolation service**

```python
# backend/app/services/interpolation.py


def calculate_lerp_fraction(elapsed: float, total: float) -> float:
    """
    Calculate progress fraction f = T_elapsed / T_total.
    Clamped to [0.0, 1.0].
    """
    if total <= 0:
        return 0.0
    fraction = elapsed / total
    return max(0.0, min(1.0, fraction))


def interpolate_position(
    start: tuple[float, float],
    end: tuple[float, float],
    fraction: float,
) -> tuple[float, float]:
    """
    Linear interpolation between two coordinate points.
    P_current = P_start + f × (P_end - P_start)
    """
    lng_start, lat_start = start
    lng_end, lat_end = end

    lng_current = lng_start + fraction * (lng_end - lng_start)
    lat_current = lat_start + fraction * (lat_end - lat_start)

    return (lng_current, lat_current)
```

- [ ] **Step 4: Run tests**

Run: `cd backend && python -m pytest tests/test_interpolation.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/interpolation.py backend/tests/test_interpolation.py
git commit -m "feat: add LERP interpolation service for train positions"
```

---

## Task 6: Train Models & Schemas

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/station.py`
- Create: `backend/app/models/track.py`
- Create: `backend/app/models/train.py`
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/schemas/train.py`
- Create: `backend/app/schemas/websocket.py`

- [ ] **Step 1: Create model files**

```python
# backend/app/models/__init__.py
```

```python
# backend/app/models/station.py
from dataclasses import dataclass
from typing import Optional


@dataclass
class Station:
    station_code: str
    station_name: str
    division: Optional[str] = None
    zone: Optional[str] = None
    longitude: Optional[float] = None
    latitude: Optional[float] = None
```

```python
# backend/app/models/track.py
from dataclasses import dataclass
from typing import Optional


@dataclass
class Track:
    id: int
    osm_id: Optional[int] = None
    gauge: str = "broad"
    electrified: bool = True
    tracks_count: int = 2
    geom_wkt: Optional[str] = None
```

```python
# backend/app/models/train.py
from dataclasses import dataclass
from typing import Optional


@dataclass
class Train:
    train_number: str
    train_name: str
    source_station_code: Optional[str] = None
    destination_station_code: Optional[str] = None
    runs_on_days: Optional[str] = None


@dataclass
class TrainTelemetry:
    train_number: str
    last_station_code: Optional[str] = None
    next_station_code: Optional[str] = None
    delay_minutes: int = 0
    bearing: int = 0
    current_lng: Optional[float] = None
    current_lat: Optional[float] = None
```

- [ ] **Step 2: Create schema files**

```python
# backend/app/schemas/__init__.py
```

```python
# backend/app/schemas/train.py
from pydantic import BaseModel
from typing import Optional


class TrainResponse(BaseModel):
    train_number: str
    train_name: str
    source_station_code: Optional[str] = None
    destination_station_code: Optional[str] = None
    runs_on_days: Optional[str] = None


class TrainSearchRequest(BaseModel):
    query: str


class TrainListResponse(BaseModel):
    trains: list[TrainResponse]
    count: int
```

```python
# backend/app/schemas/websocket.py
import struct
from pydantic import BaseModel
from typing import Optional


class TrainPosition(BaseModel):
    train_id: int
    longitude: float
    latitude: float
    bearing: int
    delay: int


# Binary protocol: [TrainID:4][Lng:4][Lat:4][Bearing:2][Delay:2] = 16 bytes
TRAIN_POSITION_FORMAT = "!ifffi"  # Network byte order, float, float, int, int
TRAIN_POSITION_SIZE = 16


def encode_train_position(pos: TrainPosition) -> bytes:
    """Encode train position to binary format."""
    return struct.pack(
        TRAIN_POSITION_FORMAT,
        pos.train_id,
        pos.longitude,
        pos.latitude,
        pos.bearing,
        pos.delay,
    )


def decode_train_position(data: bytes) -> TrainPosition:
    """Decode binary data to train position."""
    train_id, lng, lat, bearing, delay = struct.unpack(TRAIN_POSITION_FORMAT, data)
    return TrainPosition(
        train_id=train_id,
        longitude=lng,
        latitude=lat,
        bearing=bearing,
        delay=delay,
    )
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/ backend/app/schemas/
git commit -m "feat: add train models and WebSocket binary schemas"
```

---

## Task 7: Train Router Endpoints

**Files:**
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/routers/trains.py`
- Create: `backend/app/routers/stations.py`

- [ ] **Step 1: Create router files**

```python
# backend/app/routers/__init__.py
```

```python
# backend/app/routers/trains.py
from fastapi import APIRouter, Depends, Query
import asyncpg
from app.dependencies import get_db_connection
from app.schemas.train import TrainResponse, TrainListResponse

router = APIRouter(prefix="/trains", tags=["trains"])


@router.get("/", response_model=TrainListResponse)
async def list_trains(
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    conn: asyncpg.Connection = Depends(get_db_connection),
):
    """List all trains with pagination."""
    rows = await conn.fetch(
        "SELECT train_number, train_name, source_station_code, destination_station_code, runs_on_days "
        "FROM trains ORDER BY train_number LIMIT $1 OFFSET $2",
        limit,
        offset,
    )
    trains = [TrainResponse(**dict(row)) for row in rows]
    count = await conn.fetchval("SELECT COUNT(*) FROM trains")
    return TrainListResponse(trains=trains, count=count)


@router.get("/{train_number}", response_model=TrainResponse)
async def get_train(
    train_number: str,
    conn: asyncpg.Connection = Depends(get_db_connection),
):
    """Get a specific train by number."""
    row = await conn.fetchrow(
        "SELECT train_number, train_name, source_station_code, destination_station_code, runs_on_days "
        "FROM trains WHERE train_number = $1",
        train_number,
    )
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Train not found")
    return TrainResponse(**dict(row))


@router.get("/search/{query}", response_model=TrainListResponse)
async def search_trains(
    query: str,
    conn: asyncpg.Connection = Depends(get_db_connection),
):
    """Search trains by number or name."""
    rows = await conn.fetch(
        "SELECT train_number, train_name, source_station_code, destination_station_code, runs_on_days "
        "FROM trains WHERE train_number LIKE $1 OR train_name ILIKE $1 "
        "ORDER BY train_number LIMIT 50",
        f"%{query}%",
    )
    trains = [TrainResponse(**dict(row)) for row in rows]
    return TrainListResponse(trains=trains, count=len(trains))
```

```python
# backend/app/routers/stations.py
from fastapi import APIRouter, Depends, Query
import asyncpg
from app.dependencies import get_db_connection

router = APIRouter(prefix="/stations", tags=["stations"])


@router.get("/")
async def list_stations(
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    conn: asyncpg.Connection = Depends(get_db_connection),
):
    """List all stations with pagination."""
    rows = await conn.fetch(
        "SELECT station_code, station_name, division, zone "
        "FROM stations ORDER BY station_code LIMIT $1 OFFSET $2",
        limit,
        offset,
    )
    stations = [dict(row) for row in rows]
    count = await conn.fetchval("SELECT COUNT(*) FROM stations")
    return {"stations": stations, "count": count}


@router.get("/{station_code}")
async def get_station(
    station_code: str,
    conn: asyncpg.Connection = Depends(get_db_connection),
):
    """Get a specific station by code."""
    row = await conn.fetchrow(
        "SELECT station_code, station_name, division, zone "
        "FROM stations WHERE station_code = $1",
        station_code,
    )
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Station not found")
    return dict(row)
```

- [ ] **Step 2: Update main.py to include routers**

```python
# backend/app/main.py (add after imports)
from app.routers import trains, stations

# Add after app = FastAPI(...)
app.include_router(trains.router, prefix=settings.API_V1_STR)
app.include_router(stations.router, prefix=settings.API_V1_STR)
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/routers/ backend/app/main.py
git commit -m "feat: add train and station REST endpoints"
```

---

## Task 8: WebSocket Broadcaster Service

**Files:**
- Create: `backend/app/services/broadcaster.py`
- Create: `backend/app/routers/ws.py`

- [ ] **Step 1: Create broadcaster service**

```python
# backend/app/services/broadcaster.py
import logging
import json
from typing import AsyncGenerator
import redis.asyncio as redis
from app.config import settings

logger = logging.getLogger("MapMyTrain.Broadcaster")

REDIS_CHANNEL = "train:updates"


class Broadcaster:
    def __init__(self):
        self.redis_url = settings.REDIS_URL
        self._client: redis.Redis | None = None

    async def initialize(self):
        """Create Redis connection for pub/sub."""
        if self._client is None:
            self._client = redis.from_url(self.redis_url, decode_responses=True)
            logger.info("Broadcaster Redis connection established.")

    async def close(self):
        """Close Redis connection."""
        if self._client:
            await self._client.close()
            self._client = None

    async def publish(self, train_number: str, data: dict) -> None:
        """Publish train update to Redis channel."""
        if not self._client:
            return
        message = json.dumps({"train_number": train_number, **data})
        await self._client.publish(REDIS_CHANNEL, message)

    async def subscribe(self) -> AsyncGenerator[str, None]:
        """Subscribe to train updates channel."""
        if not self._client:
            return
        pubsub = self._client.pubsub()
        await pubsub.subscribe(REDIS_CHANNEL)
        async for message in pubsub.listen():
            if message["type"] == "message":
                yield message["data"]


# Global broadcaster instance
broadcaster = Broadcaster()
```

- [ ] **Step 2: Create WebSocket router**

```python
# backend/app/routers/ws.py
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.broadcaster import broadcaster
from app.schemas.websocket import TrainPosition, encode_train_position

logger = logging.getLogger("MapMyTrain.WS")

router = APIRouter(tags=["websocket"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, data: bytes):
        for connection in self.active_connections:
            try:
                await connection.send_bytes(data)
            except Exception:
                pass


manager = ConnectionManager()


@ws_router.websocket("/stream")
async def websocket_stream(websocket: WebSocket):
    """WebSocket endpoint for real-time train positions."""
    await manager.connect(websocket)
    try:
        async for message in broadcaster.subscribe():
            try:
                data = json.loads(message)
                pos = TrainPosition(
                    train_id=int(data.get("train_number", 0)),
                    longitude=float(data.get("longitude", 0)),
                    latitude=float(data.get("latitude", 0)),
                    bearing=int(data.get("bearing", 0)),
                    delay=int(data.get("delay", 0)),
                )
                encoded = encode_train_position(pos)
                await manager.broadcast(encoded)
            except Exception as e:
                logger.error(f"Error processing message: {e}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)


ws_router = APIRouter()
```

- [ ] **Step 3: Update main.py to include WebSocket router**

```python
# backend/app/main.py (add after other router imports)
from app.routers.ws import ws_router

# Add after other include_router calls
app.include_router(ws_router, prefix=settings.API_V1_STR)
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/broadcaster.py backend/app/routers/ws.py backend/app/main.py
git commit -m "feat: add WebSocket broadcaster with binary protobuf streaming"
```

---

## Task 9: Next.js Frontend Setup

**Files:**
- Create: `frontend/` directory structure
- Create: `frontend/package.json`
- Create: `frontend/next.config.js`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/app/layout.tsx`
- Create: `frontend/app/page.tsx`
- Create: `frontend/app/globals.css`
- Create: `frontend/lib/types.ts`
- Create: `frontend/lib/constants.ts`

- [ ] **Step 1: Initialize Next.js project**

Run: `npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"`

- [ ] **Step 2: Create types.ts**

```typescript
// frontend/lib/types.ts
export interface Train {
  train_number: string;
  train_name: string;
  source_station_code?: string;
  destination_station_code?: string;
  runs_on_days?: string;
}

export interface Station {
  station_code: string;
  station_name: string;
  division?: string;
  zone?: string;
  longitude?: number;
  latitude?: number;
}

export interface TrainPosition {
  train_id: number;
  longitude: number;
  latitude: number;
  bearing: number;
  delay: number;
}

export interface TrainListResponse {
  trains: Train[];
  count: number;
}
```

- [ ] **Step 3: Create constants.ts**

```typescript
// frontend/lib/constants.ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
export const WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL || "ws://localhost:8000/api/v1/stream";
export const TILE_SERVER_URL = process.env.NEXT_PUBLIC_TILE_SERVER_URL || "http://localhost:8080";
export const USE_MOCK_TELEMETRY = process.env.NEXT_PUBLIC_USE_MOCK_TELEMETRY === "true";

export const MAP_CENTER: [number, number] = [78.9629, 22.5937]; // India center
export const MAP_ZOOM = 5;

export const DARK_MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
```

- [ ] **Step 4: Commit**

```bash
git add frontend/
git commit -m "feat: initialize Next.js 14 frontend with TypeScript and Tailwind"
```

---

## Task 10: MapLibre WebGL Canvas Component

**Files:**
- Create: `frontend/components/map/MapCanvas.tsx`
- Create: `frontend/components/map/TrackLayer.tsx`
- Create: `frontend/components/map/TrainMarker.tsx`

- [ ] **Step 1: Create MapCanvas.tsx**

```tsx
// frontend/components/map/MapCanvas.tsx
"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_CENTER, MAP_ZOOM, DARK_MAP_STYLE, TILE_SERVER_URL } from "@/lib/constants";

export default function MapCanvas() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: DARK_MAP_STYLE,
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      pitch: 0,
      bearing: 0,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <div
      ref={mapContainer}
      className="absolute inset-0 w-full h-full"
      style={{ touchAction: "none" }}
    />
  );
}
```

- [ ] **Step 2: Create TrackLayer.tsx**

```tsx
// frontend/components/map/TrackLayer.tsx
"use client";

import { useEffect } from "react";
import { useMap } from "./MapCanvasContext";

export default function TrackLayer() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    map.on("load", () => {
      map.addSource("tracks", {
        type: "vector",
        tiles: ["http://localhost:8080/data/tracks/{z}/{x}/{y}.pbf"],
        minzoom: 0,
        maxzoom: 14,
      });

      map.addLayer({
        id: "tracks-line",
        type: "line",
        source: "tracks",
        "source-layer": "tracks",
        paint: {
          "line-color": "#3b82f6",
          "line-width": 2,
          "line-opacity": 0.8,
        },
      });
    });
  }, [map]);

  return null;
}
```

- [ ] **Step 3: Create TrainMarker.tsx**

```tsx
// frontend/components/map/TrainMarker.tsx
"use client";

import { useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import { useMap } from "./MapCanvasContext";
import { TrainPosition } from "@/lib/types";

interface TrainMarkerProps {
  position: TrainPosition;
  onClick?: () => void;
}

export default function TrainMarker({ position, onClick }: TrainMarkerProps) {
  const map = useMap();
  const [marker, setMarker] = useState<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    const el = document.createElement("div");
    el.className = "train-marker";
    el.style.width = "24px";
    el.style.height = "24px";
    el.style.cursor = "pointer";
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L4 20H20L12 2Z" fill="#22c55e" transform="rotate(${position.bearing} 12 12)"/>
    </svg>`;

    const newMarker = new maplibregl.Marker({ element: el })
      .setLngLat([position.longitude, position.latitude])
      .addTo(map);

    if (onClick) {
      el.addEventListener("click", onClick);
    }

    setMarker(newMarker);

    return () => {
      newMarker.remove();
    };
  }, [map, position.longitude, position.latitude, position.bearing]);

  useEffect(() => {
    if (marker) {
      marker.setLngLat([position.longitude, position.latitude]);
    }
  }, [marker, position.longitude, position.latitude]);

  return null;
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/components/map/
git commit -m "feat: add MapLibre WebGL canvas with track and train marker layers"
```

---

## Task 11: WebSocket Provider & Real-Time Updates

**Files:**
- Create: `frontend/providers/WebSocketProvider.tsx`
- Create: `frontend/hooks/useWebSocket.ts`
- Create: `frontend/components/ui/StatusBar.tsx`

- [ ] **Step 1: Create useWebSocket hook**

```typescript
// frontend/hooks/useWebSocket.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { WS_URL, USE_MOCK_TELEMETRY } from "@/lib/constants";
import { TrainPosition } from "@/lib/types";

const TRAIN_POSITION_SIZE = 16;

export function useWebSocket() {
  const [positions, setPositions] = useState<Map<number, TrainPosition>>(new Map());
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (USE_MOCK_TELEMETRY) {
      // Load mock data
      loadMockData();
      return;
    }

    ws.current = new WebSocket(WS_URL);
    ws.current.binaryType = "arraybuffer";

    ws.current.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        const view = new DataView(event.data);
        if (event.data.byteLength >= TRAIN_POSITION_SIZE) {
          const trainId = view.getInt32(0);
          const lng = view.getFloat32(4);
          const lat = view.getFloat32(8);
          const bearing = view.getInt16(12);
          const delay = view.getInt16(14);

          setPositions((prev) => {
            const next = new Map(prev);
            next.set(trainId, { train_id: trainId, longitude: lng, latitude: lat, bearing, delay });
            return next;
          });
        }
      }
    };

    return () => {
      ws.current?.close();
    };
  }, []);

  const loadMockData = async () => {
    const res = await fetch("/data/mock_trains.json");
    const data = await res.json();
    const mockPositions = new Map<number, TrainPosition>();
    data.trains.forEach((t: TrainPosition) => mockPositions.set(t.train_id, t));
    setPositions(mockPositions);
  };

  return { positions };
}
```

- [ ] **Step 2: Create WebSocketProvider**

```tsx
// frontend/providers/WebSocketProvider.tsx
"use client";

import { createContext, useContext, ReactNode } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { TrainPosition } from "@/lib/types";

interface WebSocketContextType {
  positions: Map<number, TrainPosition>;
}

const WebSocketContext = createContext<WebSocketContextType>({ positions: new Map() });

export function useTrainPositions() {
  return useContext(WebSocketContext);
}

export default function WebSocketProvider({ children }: { children: ReactNode }) {
  const { positions } = useWebSocket();

  return (
    <WebSocketContext.Provider value={{ positions }}>
      {children}
    </WebSocketContext.Provider>
  );
}
```

- [ ] **Step 3: Create StatusBar**

```tsx
// frontend/components/ui/StatusBar.tsx
export default function StatusBar() {
  return (
    <div className="absolute bottom-2 right-2 z-50 text-[10px] text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded backdrop-blur-sm">
      © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:underline text-sky-400">OpenStreetMap</a> contributors
    </div>
  );
}
```

- [ ] **Step 4: Update page.tsx**

```tsx
// frontend/app/page.tsx
import MapCanvas from "@/components/map/MapCanvas";
import TrackLayer from "@/components/map/TrackLayer";
import StatusBar from "@/components/ui/StatusBar";
import WebSocketProvider from "@/providers/WebSocketProvider";

export default function Home() {
  return (
    <main className="relative w-full h-screen bg-slate-950">
      <WebSocketProvider>
        <MapCanvas />
        <TrackLayer />
        <StatusBar />
      </WebSocketProvider>
    </main>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/providers/ frontend/hooks/ frontend/components/ui/ frontend/app/page.tsx
git commit -m "feat: add WebSocket provider for real-time train position updates"
```

---

## Task 12: Mock Data & Search UI

**Files:**
- Create: `frontend/public/data/mock_trains.json`
- Create: `frontend/components/ui/SearchBar.tsx`
- Create: `frontend/components/ui/TrainDrawer.tsx`

- [ ] **Step 1: Create mock data**

```json
// frontend/public/data/mock_trains.json
{
  "trains": [
    {
      "train_id": 12301,
      "longitude": 77.2090,
      "latitude": 28.6139,
      "bearing": 45,
      "delay": 12
    },
    {
      "train_id": 12951,
      "longitude": 78.5432,
      "latitude": 27.1234,
      "bearing": 180,
      "delay": 0
    },
    {
      "train_id": 12625,
      "longitude": 79.8765,
      "latitude": 26.5432,
      "bearing": 270,
      "delay": 35
    }
  ]
}
```

- [ ] **Step 2: Create SearchBar**

```tsx
// frontend/components/ui/SearchBar.tsx
"use client";

import { useState } from "react";

export default function SearchBar() {
  const [query, setQuery] = useState("");

  return (
    <div className="absolute top-4 left-4 right-4 z-50">
      <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg p-2 flex items-center gap-2">
        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Train No. or Station..."
          className="flex-1 bg-transparent text-white placeholder-slate-400 focus:outline-none"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create TrainDrawer**

```tsx
// frontend/components/ui/TrainDrawer.tsx
"use client";

import { TrainPosition } from "@/lib/types";

interface TrainDrawerProps {
  train: TrainPosition | null;
  onClose: () => void;
}

export default function TrainDrawer({ train, onClose }: TrainDrawerProps) {
  if (!train) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm rounded-t-xl p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-semibold">Train #{train.train_id}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-slate-400">Status:</span>
          <span className={`ml-2 ${train.delay > 0 ? "text-yellow-400" : "text-green-400"}`}>
            {train.delay > 0 ? `${train.delay} min delayed` : "On time"}
          </span>
        </div>
        <div>
          <span className="text-slate-400">Bearing:</span>
          <span className="ml-2 text-white">{train.bearing}°</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/public/data/ frontend/components/ui/
git commit -m "feat: add mock data and search/drawer UI components"
```

---

## Task 13: Ingestion Worker

**Files:**
- Create: `backend/app/ingestion/__init__.py`
- Create: `backend/app/ingestion/worker.py`
- Create: `backend/app/ingestion/scraper.py`
- Create: `backend/app/ingestion/parser.py`

- [ ] **Step 1: Create parser**

```python
# backend/app/ingestion/parser.py
import re
from typing import Optional
from app.models.train import TrainTelemetry


def parse_ntes_response(raw: str) -> Optional[TrainTelemetry]:
    """Parse raw NTES API response string into TrainTelemetry."""
    try:
        train_number_match = re.search(r'"trainNumber"\s*:\s*"(\d+)"', raw)
        if not train_number_match:
            return None
        train_number = train_number_match.group(1)

        lat_match = re.search(r'"latitude"\s*:\s*([0-9.]+)', raw)
        lng_match = re.search(r'"longitude"\s*:\s*([0-9.]+)', raw)
        delay_match = re.search(r'"delay"\s*:\s*(\d+)', raw)
        bearing_match = re.search(r'"bearing"\s*:\s*(\d+)', raw)

        return TrainTelemetry(
            train_number=train_number,
            current_lng=float(lng_match.group(1)) if lng_match else None,
            current_lat=float(lat_match.group(1)) if lat_match else None,
            delay_minutes=int(delay_match.group(1)) if delay_match else 0,
            bearing=int(bearing_match.group(1)) if bearing_match else 0,
        )
    except Exception:
        return None
```

- [ ] **Step 2: Create scraper**

```python
# backend/app/ingestion/scraper.py
import random
import logging
import httpx
from typing import Optional
from app.ingestion.parser import parse_ntes_response
from app.models.train import TrainTelemetry

logger = logging.getLogger("MapMyTrain.Scraper")

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
]

NTES_BASE_URL = "https://ntes.indianrail.gov.in/Coreata"
NTES_QUERY_PATH = "/QueryResult?queryType=LiveTrainStatus&trainNo={train_number}&date={date}"


async def fetch_train_status(train_number: str, date: str) -> Optional[TrainTelemetry]:
    """Fetch live train status from NTES."""
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": NTES_BASE_URL,
        "Referer": f"{NTES_BASE_URL}/",
    }

    url = f"{NTES_BASE_URL}{NTES_QUERY_PATH.format(train_number=train_number, date=date)}"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=10.0)
            response.raise_for_status()
            return parse_ntes_response(response.text)
    except httpx.HTTPStatusError as e:
        logger.warning(f"HTTP {e.response.status_code} for train {train_number}")
        return None
    except Exception as e:
        logger.error(f"Scraper error for train {train_number}: {e}")
        return None
```

- [ ] **Step 3: Create worker**

```python
# backend/app/ingestion/worker.py
import asyncio
import logging
from datetime import datetime
from app.config import settings
from app.services.cache import cache_service
from app.services.broadcaster import broadcaster
from app.ingestion.scraper import fetch_train_status

logger = logging.getLogger("MapMyTrain.Worker")


async def process_train(train_number: str):
    """Fetch and cache a single train's status."""
    today = datetime.now().strftime("%Y%m%d")
    telemetry = await fetch_train_status(train_number, today)

    if telemetry and telemetry.current_lng and telemetry.current_lat:
        data = {
            "train_number": telemetry.train_number,
            "longitude": telemetry.current_lng,
            "latitude": telemetry.current_lat,
            "bearing": telemetry.bearing,
            "delay": telemetry.delay_minutes,
        }
        await cache_service.set_train_data(train_number, data)
        await broadcaster.publish(train_number, data)


async def run_ingestion_loop():
    """Main ingestion loop that periodically fetches active trains."""
    await cache_service.initialize()
    await broadcaster.initialize()

    logger.info("Ingestion worker started.")

    while True:
        try:
            # In production, fetch active train list from database
            # For now, use a placeholder list
            active_trains = ["12301", "12951", "12625"]

            for train_number in active_trains:
                if not await cache_service.is_inactive(train_number):
                    await process_train(train_number)
                    await asyncio.sleep(2)  # Rate limiting between requests

        except Exception as e:
            logger.error(f"Ingestion loop error: {e}")

        await asyncio.sleep(settings.INGESTION_INTERVAL_SECONDS)
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/ingestion/
git commit -m "feat: add ingestion worker with NTES scraper and parser"
```

---

## Task 14: Docker Compose Full Stack

**Files:**
- Modify: `docker-compose.yml` (add frontend service)

- [ ] **Step 1: Add frontend service to docker-compose.yml**

```yaml
# Add to docker-compose.yml services section
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: mmt-nextjs-frontend
    environment:
      - NEXT_PUBLIC_BACKEND_WS_URL=ws://localhost:8000/api/v1/stream
      - NEXT_PUBLIC_TILE_SERVER_URL=http://localhost:8080
    ports:
      - "3000:3000"
    depends_on:
      - backend
    networks:
      - mapmytrain-mesh
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev
```

- [ ] **Step 2: Create frontend Dockerfile**

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

CMD ["npm", "run", "dev"]
```

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml frontend/Dockerfile
git commit -m "feat: add frontend to Docker Compose stack"
```

---

## Task 15: Integration Tests

**Files:**
- Create: `backend/tests/test_integration.py`

- [ ] **Step 1: Write integration test**

```python
# backend/tests/test_integration.py
import pytest
from httpx import AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_trains_endpoint():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/v1/trains/")
        assert response.status_code == 200
        assert "trains" in response.json()


@pytest.mark.asyncio
async def test_stations_endpoint():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/v1/stations/")
        assert response.status_code == 200
        assert "stations" in response.json()
```

- [ ] **Step 2: Run all tests**

Run: `cd backend && python -m pytest tests/ -v`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_integration.py
git commit -m "feat: add integration tests for API endpoints"
```

---

## Task 16: Final Setup & Documentation

**Files:**
- Create: `README.md`
- Create: `.gitignore`

- [ ] **Step 1: Create README.md**

```markdown
# MapMyTrain

Real-time spatial tracking platform for Indian Railways.

## Quick Start

1. Start infrastructure:
```bash
docker compose -f docker-compose.dev.yml up -d
```

2. Run backend:
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

3. Run frontend:
```bash
cd frontend
npm install
npm run dev
```

4. Open http://localhost:3000

## Environment Variables

Copy `.env.example` to `backend/.env` and configure:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `DEVELOPMENT_MOCK_MODE`: Enable mock data
```

- [ ] **Step 2: Create .gitignore**

```gitignore
# .gitignore
node_modules/
__pycache__/
*.pyc
.env
.env.local
.superpowers/
```

- [ ] **Step 3: Final commit**

```bash
git add README.md .gitignore
git commit -m "docs: add README and gitignore"
```

---

## Execution Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | PostGIS schema migrations | 5 SQL files |
| 2 | Backend dependencies & Docker | 5 config files |
| 3 | FastAPI main app | 4 Python files |
| 4 | Redis cache service | 2 Python files |
| 5 | LERP interpolation | 2 Python files |
| 6 | Train models & schemas | 6 Python files |
| 7 | Train router endpoints | 3 Python files |
| 8 | WebSocket broadcaster | 2 Python files |
| 9 | Next.js frontend setup | 6 config files |
| 10 | MapLibre WebGL canvas | 3 React components |
| 11 | WebSocket provider | 3 React components |
| 12 | Mock data & search UI | 3 files |
| 13 | Ingestion worker | 3 Python files |
| 14 | Docker Compose full stack | 2 files |
| 15 | Integration tests | 1 test file |
| 16 | Final setup | 2 files |

**Total: ~50 files created/modified**
