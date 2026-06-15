# 📄 Technical Document 3: Data Dictionary & Database Schema Specification

**Project Name:** MapMyTrain

**Author:** Lead Data Architect

**Status:** Ready for Migration

**Database Engine:** PostgreSQL 16+ with PostGIS 3.4+ Extension

---

## 1. Global Geodetic Parameters

All spatial records inside the database are strictly normalized to **WGS 84** (Spatial Reference Identifier: **`SRID 4326`**). Longitude and latitude coordinate sets must be stored using explicit double-precision floats (`FLOAT8`) to avoid computational precision drifting when rendering high-zoom train yard layouts.

---

## 2. Table Definitions & Schemas

### 2.1 Table: `users`

Tracks identity authentication and maps application premium access flags for the open-core tier structure.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    tier VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

```

### 2.2 Table: `stations`

The spatial lookup matrix representing physical passenger stops and junctions across the railway network.

```sql
CREATE TABLE stations (
    station_code VARCHAR(10) PRIMARY KEY, -- e.g., 'NDLS', 'CSMT'
    station_name VARCHAR(150) NOT NULL,
    division VARCHAR(50),
    zone VARCHAR(10), -- e.g., 'NR', 'CR'
    geom GEOMETRY(Point, 4326) NOT NULL, -- Core spatial coordinate node
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

```

### 2.3 Table: `tracks`

Maps the high-fidelity spatial lines of actual physical railway segments harvested via OpenStreetMap relation vectors.

```sql
CREATE TABLE tracks (
    id SERIAL PRIMARY KEY,
    osm_id BIGINT UNIQUE, -- Direct trace link back to OpenStreetMap way ID
    gauge VARCHAR(20) DEFAULT 'broad' CHECK (gauge IN ('broad', 'meter', 'narrow')),
    electrified BOOLEAN DEFAULT TRUE,
    tracks_count INT DEFAULT 2, -- Tracks running in parallel on this specific alignment
    geom GEOMETRY(LineString, 4326) NOT NULL -- Polyline path matching physical terrain
);

```

### 2.4 Table: `trains`

Stores core indexing profiles and configuration parameters for all operational passenger and freight trains.

```sql
CREATE TABLE trains (
    train_number VARCHAR(10) PRIMARY KEY, -- 5-digit primary index key (e.g., '12301')
    train_name VARCHAR(150) NOT NULL,
    source_station_code VARCHAR(10) REFERENCES stations(station_code),
    destination_station_code VARCHAR(10) REFERENCES stations(station_code),
    runs_on_days VARCHAR(7) NOT NULL, -- Binary bit string token (e.g., '1111100' for Mon-Fri)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

```

### 2.5 Table: `train_telemetry_logs`

Time-series spatial sink logging every volatile ingestion update for caching invalidation and analytical replay.

```sql
CREATE TABLE train_telemetry_logs (
    id BIGSERIAL PRIMARY KEY,
    train_number VARCHAR(10) REFERENCES trains(train_number) ON DELETE CASCADE,
    last_station_code VARCHAR(10) REFERENCES stations(station_code),
    next_station_code VARCHAR(10) REFERENCES stations(station_code),
    delay_minutes INT DEFAULT 0,
    bearing INT CHECK (bearing BETWEEN 0 AND 359),
    current_location GEOMETRY(Point, 4326), -- Ingested or calculated point node
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

```

---

## 3. Structural Relations Model

| Table | Column Source | Target Table | Target Constraint | Action Rule |
| --- | --- | --- | --- | --- |
| `trains` | `source_station_code` | `stations` | `station_code` | RESTRICT |
| `trains` | `destination_station_code` | `stations` | `station_code` | RESTRICT |
| `train_telemetry_logs` | `train_number` | `trains` | `train_number` | CASCADE |
| `train_telemetry_logs` | `last_station_code` | `stations` | `station_code` | SET NULL |

---

## 4. Indexing Strategy for High-Velocity Spatial Lookups

Standard B-Tree indexing parameters fail during multi-dimensional spatial queries. To evaluate physical point intersections inside regional bounding boxes, the system implements **Generalized Search Tree (GiST)** indexes.

```sql
-- High-Performance spatial indexes for rendering viewport calculations
CREATE INDEX idx_stations_spatial_geom ON stations USING GIST (geom);
CREATE INDEX idx_tracks_spatial_geom ON tracks USING GIST (geom);
CREATE INDEX idx_telemetry_spatial_geom ON train_telemetry_logs USING GIST (current_location);

-- B-Tree lookup performance optimizations for non-spatial values
CREATE INDEX idx_trains_lookup ON trains (train_number, train_name);
CREATE INDEX idx_telemetry_time_series ON train_telemetry_logs (train_number, captured_at DESC);

```

---

## 5. Automated Caching Maintenance Trigger

To prevent the `train_telemetry_logs` data stack from inflating and crashing database queries over time, a PostgreSQL cron job automatically transitions old operational states to long-term cold files while maintaining a hot state engine wrapper.

```sql
-- Trigger routine execution to dump records older than 48 hours
CREATE OR REPLACE FUNCTION clean_expired_telemetry()
RETURNS void AS $$
BEGIN
    DELETE FROM train_telemetry_logs 
    WHERE captured_at < NOW() - INTERVAL '48 hours';
END;
$$ LANGUAGE plpgsql;

```

---

Document 3 (Data Dictionary & Database Schema Specification) is finalized and verified against standard PostGIS structures. Let me know when you are ready to generate Document 4 (Ingestion API & Scraping Runbook).

For a hands-on tutorial on importing geographic datasets seamlessly into PostGIS infrastructure configurations, you may find the [OSM to PostGIS Data Guide](https://www.youtube.com/watch?v=oFg3nh3hZ7I) helpful. This video provides step-by-step instructions on setting up toolsets like `osm2pgsql` to import track geometries directly into your database.