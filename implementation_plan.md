# Integrate Real Train Data from `data_train/`

Replace all mock/hardcoded data with real Indian Railways data: **5,208 trains**, **8,697 geo-located stations**, **417,080 schedule stops**, and **actual route geometries**.

## Data Discovery Summary

| File | Format | Records | Key Fields |
|------|--------|---------|------------|
| `stations.json` | GeoJSON FeatureCollection | 8,990 (8,697 with coords) | `code`, `name`, `state`, `zone`, `address`, `coordinates` |
| `trains.json` | GeoJSON FeatureCollection | 5,208 | `number`, `name`, `type`, `zone`, `from/to_station_code/name`, `departure/arrival`, `duration_h/m`, `distance`, `classes` (1AC/2AC/3AC/SL/CC/FC), `return_train`, **LineString geometry** (actual route!) |
| `schedules.json` | JSON Array | 417,080 | `train_number`, `train_name`, `station_code`, `station_name`, `arrival`, `departure`, `day`, `id` |

> [!IMPORTANT]
> `trains.json` contains **LineString route geometries** for every train. This is extremely valuable — we can render exact train routes on the map without needing to derive them from the `tracks` table.

## User Review Required

> [!WARNING]
> This plan adds ~100MB of data to the database via a seed script. The seeding process may take 2-5 minutes depending on your machine. The `data_train/` folder is already in `.gitignore`.

> [!IMPORTANT]
> This replaces the hardcoded `MOCK_TRAINS` (3 trains) and `MOCK_TIMETABLE` (5 stops) with live API calls. The SearchBar and TrainDrawer will both rely on the backend being running with seeded data.

## Open Questions

1. **Offline fallback**: Should we keep a small subset of MOCK_TRAINS as fallback when the backend is down, or show an empty state?
2. **Train type colors**: `trains.json` has train types (Rajdhani, Shatabdi, DEMU, Express, etc.). Should we color-code markers/routes by type?

---

## Proposed Changes

### Database Layer

#### [NEW] [007_create_train_schedules.sql](file:///c:/Users/omkar/Documents/github/MapMyTrain/backend/migrations/007_create_train_schedules.sql)
New migration for the `train_schedules` table:
```sql
CREATE TABLE train_schedules (
    id SERIAL PRIMARY KEY,
    train_number VARCHAR(10) REFERENCES trains(train_number),
    station_code VARCHAR(10),
    station_name VARCHAR(150),
    arrival TIME,
    departure TIME,
    day INTEGER DEFAULT 1,
    stop_sequence INTEGER
);
CREATE INDEX idx_train_schedules_train ON train_schedules(train_number);
CREATE INDEX idx_train_schedules_station ON train_schedules(station_code);
```

#### [NEW] [008_create_train_routes.sql](file:///c:/Users/omkar/Documents/github/MapMyTrain/backend/migrations/008_create_train_routes.sql)
New migration for storing route geometries from `trains.json`:
```sql
CREATE TABLE train_routes (
    train_number VARCHAR(10) PRIMARY KEY REFERENCES trains(train_number),
    geom GEOMETRY(LineString, 4326),
    distance_km INTEGER,
    duration_h INTEGER,
    duration_m INTEGER
);
CREATE INDEX idx_train_routes_geom ON train_routes USING GIST(geom);
```

#### [MODIFY] [003_create_trains.sql](file:///c:/Users/omkar/Documents/github/MapMyTrain/backend/migrations/003_create_trains.sql)
Add columns: `train_type VARCHAR(30)`, `zone VARCHAR(10)`, `return_train VARCHAR(10)`, `distance_km INTEGER`. These come directly from `trains.json` properties.

---

### Seed Script

#### [NEW] [seed_train_data.py](file:///c:/Users/omkar/Documents/github/MapMyTrain/backend/scripts/seed_train_data.py)
Python script that:
1. **Loads `stations.json`** → Upserts into `stations` table (8,697 with coordinates). Enriches existing stations with `state`, `address` fields.
2. **Loads `trains.json`** → Inserts into `trains` table with new columns. Stores route geometry in `train_routes`.
3. **Loads `schedules.json`** → Bulk inserts into `train_schedules` with computed `stop_sequence` (ordered by `id` per train).
4. Uses batch inserts (500 records/batch) for performance.

---

### Backend API

#### [NEW] [schedules.py](file:///c:/Users/omkar/Documents/github/MapMyTrain/backend/app/routers/schedules.py)
New router with endpoint:
- `GET /api/v1/schedules/train/{train_number}` → Returns ordered schedule stops for a train

#### [MODIFY] [routes.py](file:///c:/Users/omkar/Documents/github/MapMyTrain/backend/app/routers/routes.py)
Update `get_train_route` to first check `train_routes` table for pre-stored geometry (from `trains.json`), falling back to the existing `ST_Collect(tracks)` approach.

#### [MODIFY] [trains.py](file:///c:/Users/omkar/Documents/github/MapMyTrain/backend/app/routers/trains.py)
Add `train_type`, `zone`, `distance_km` to query results.

#### [MODIFY] [train.py (schema)](file:///c:/Users/omkar/Documents/github/MapMyTrain/backend/app/schemas/train.py)
Add new fields to `TrainResponse`: `train_type`, `zone`, `distance_km`, `return_train`.

#### [MODIFY] [main.py](file:///c:/Users/omkar/Documents/github/MapMyTrain/backend/app/main.py)
Register the new `schedules` router.

---

### Frontend

#### [MODIFY] [types.ts](file:///c:/Users/omkar/Documents/github/MapMyTrain/frontend/lib/types.ts)
Add new interfaces:
- `ScheduleStop` — `station_code`, `station_name`, `arrival`, `departure`, `day`, `stop_sequence`
- Extend `Train` — add `train_type`, `zone`, `distance_km`

#### [MODIFY] [constants.ts](file:///c:/Users/omkar/Documents/github/MapMyTrain/frontend/lib/constants.ts)
Remove `MOCK_TRAINS` array. Add `TRAIN_TYPE_COLORS` map for visual differentiation.

#### [MODIFY] [MapViewController.tsx](file:///c:/Users/omkar/Documents/github/MapMyTrain/frontend/components/MapViewController.tsx)
- Fetch trains from `GET /api/v1/trains/` on mount (with search-as-you-type via `/trains/search/{query}`)
- Pass real train list to `SearchBar` instead of `MOCK_TRAINS`

#### [MODIFY] [TrainDrawer.tsx](file:///c:/Users/omkar/Documents/github/MapMyTrain/frontend/components/ui/TrainDrawer.tsx)
- Remove `MOCK_TIMETABLE`
- Fetch real schedule via `GET /api/v1/schedules/train/{train_number}` when a train is selected
- Show train type badge, distance, duration
- Display all real stops with arrival/departure times

#### [MODIFY] [SearchBar.tsx](file:///c:/Users/omkar/Documents/github/MapMyTrain/frontend/components/ui/SearchBar.tsx)
- Add debounced API search: call `/api/v1/trains/search/{query}` for live results
- Show train type tag in search results

---

## Verification Plan

### Automated Tests
```bash
# Build frontend
cd frontend && npm run build

# Lint frontend
cd frontend && npm run lint

# Run backend tests
cd backend && python -m pytest tests/ -v
```

### Manual Verification
1. Run seed script → verify row counts in DB
2. Search for "Rajdhani" → see all Rajdhani trains with real data
3. Select a train → see full real schedule in TrainDrawer
4. Route rendered on map from `train_routes` geometry
5. Train type badges visible in search and drawer
