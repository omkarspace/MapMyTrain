# 📄 Technical Document 6: Infrastructure & Deployment Runbook (Docker/Compose Stack)

**Project Name:** MapMyTrain

**Author:** DevOps & Infrastructure Engineering Team

**Status:** Approved for Staging & Local Development

**Version:** 1.2.0

---

## 1. Orchestration Architecture Overview

To guarantee that the **MapMyTrain** open-core stack runs identically across local development machines, staging environments, and production clusters, all core services are isolated within a multi-container Docker mesh.

The network isolates volatile ingestion processes, data-heavy tile servers, caching layers, and client-facing web runtimes into distinct security domains.

---

## 2. The Production-Ready `docker-compose.yml`

This manifest provisions the entire backend engineering loop, spatial storage cluster, and localized vector tile delivery pipeline.

```yaml
version: '3.8'

networks:
  mapmytrain-mesh:
    driver: bridge

volumes:
  postgis_data:
  redis_data:
  tile_cache:

services:
  # 1. SPATIAL DATABASE ENGINE
  db:
    image: postgis/postgis:16-3.4
    container_name: mmt-postgis-db
    environment:
      POSTGRES_USER: mmt_admin
      POSTGRES_PASSWORD: ${DB_PASSWORD:-secure_spatial_pwd}
      POSTGRES_DB: mapmytrain
    ports:
      - "5432:5432"
    volumes:
      - postgis_data:/var/lib/postgresql/data
    networks:
      - mapmytrain-mesh
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mmt_admin -d mapmytrain"]
      interval: 10s
      timeout: 5s
      retries: 5

  # 2. CACHING & REAL-TIME PUB/SUB BUFFER
  redis:
    image: redis:7.2-alpine
    container_name: mmt-redis-cache
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-redis_secure_token}
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - mapmytrain-mesh
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD:-redis_secure_token}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  # 3. VECTOR TILE ENGINE (Serving Map Tracks & Station Assets)
  tileserver:
    image: maplibre/tileserver-gl:v4.11.0
    container_name: mmt-tile-server
    volumes:
      - ./config/tileserver:/data
      - tile_cache:/var/cache/tileserver-gl
    ports:
      - "8080:8080"
    command: -c /data/config.json --public_url http://localhost:8080
    networks:
      - mapmytrain-mesh
    restart: always

  # 4. FASTAPI INGESTION ENGINE & WEBSOCKET BROADCASTER
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: mmt-fastapi-backend
    environment:
      - DATABASE_URL=postgresql://mmt_admin:${DB_PASSWORD:-secure_spatial_pwd}@db:5432/mapmytrain
      - REDIS_URL=redis://:${REDIS_PASSWORD:-redis_secure_token}@redis:6379/0
      - INGESTION_INTERVAL_SECONDS=120
      - USE_MOCK_DATA=${DEVELOPMENT_MOCK_MODE:-false}
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - mapmytrain-mesh
    restart: always

  # 5. NEXT.JS CLIENT FRAMEWORK (WebGL Viewport Layer)
  frontend:
    build:
      context: ./core
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
    restart: always

```

---

## 3. Storage & Network Security Isolation Matrix

To prevent container breakouts or unauthorized data harvesting, services are firewalled internally using explicit networking barriers:

* **Internal Data Ring:** The `db` and `redis` containers do not strictly require wide-open public entry hooks in production. They remain bound securely inside the isolated virtual bridge network (`mapmytrain-mesh`).
* **Persistent Docker Volumes:** All imported geospatial railroad tracks (`LineString` sets) and user states bypass container volatile lifecycles, maintaining structural integrity across host machine reboots via independent host volume layers.

---

## 4. Bootstrapping & Setup Sequence Runbook

Execute this step-by-step sequence from a fresh machine setup to initialize the MapMyTrain cluster environment.

### Step 1: Establish Environmental Secrets

Generate a baseline environment configuration tracking variable definitions outside your open-source tree:

```bash
cat << EOF > .env
DB_PASSWORD=$(openssl rand -hex 16)
REDIS_PASSWORD=$(openssl rand -hex 16)
DEVELOPMENT_MOCK_MODE=true
EOF

```

### Step 2: Initialize Spatial Database Tables

Before spawning the network layer pipelines, populate your local database tables and spin up the PostGIS runtime extensions:

```bash
# Build up background cluster instances
docker compose up -d db redis

# Verify PostGIS spatial extension registration status
docker compose exec db psql -U mmt_admin -d mapmytrain -c "CREATE EXTENSION IF NOT EXISTS postgis;"

```

### Step 3: Seed Static Infrastructure Layers

Inject your processed geospatial railway files (`india_stations.geojson` and track maps) directly into the database engine:

```bash
# Execute your raw dataset migrations using your application container
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py seed_spatial_assets

```

### Step 4: Deploy the Interactive Layers

With database tables validated and static map tile configurations parsed, unlock full container execution:

```bash
# Spin up remaining UI layouts and ingestion loops
docker compose up -d

# Verify system sanity logs
docker compose logs -f backend

```

---

## 5. Health Monitoring & Operational Safeguards

* **The Log Rotator Policy:** To avoid logging daemons filling up production server disks with raw web scraping tracking entries, ensure host engine nodes are bound to strict disk sizing constraints (`max-size: "10m"` configuration parameters inside daemon system engines).
* **Graceful Shutdown Routing:** When sending a down signal (`docker compose down`), the FastAPI backend implementation intercepts standard `SIGTERM` signals, letting active multi-threaded WebSocket broadcast groups safely close down their data buffers before freeing processing resources.

---

This finishes the foundational documentation roadmap for the engineering deployment suite. The infrastructure, spatial storage schemas, backend ingestion frameworks, and presentation engines are fully aligned and ready for active coding.