# Contributing to MapMyTrain

> Open-source Indian Railways real-time spatial tracking platform.
> Core engine: Next.js 16 + MapLibre GL JS (frontend) | FastAPI + asyncpg (backend) | PostgreSQL + PostGIS | Redis.

Thank you for your interest in contributing to MapMyTrain! This document covers everything you need to get started.

## Quick Start

```bash
git clone https://github.com/omkarspace/MapMyTrain.git
cd MapMyTrain
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d
cd frontend && npm install && npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the map canvas with mock train data.

## Prerequisites

| Dependency | Version | Purpose |
|------------|---------|---------|
| Node.js | v20+ | Frontend build and dev server |
| Python | v3.12+ | Backend API server |
| Docker | Latest | Local PostGIS + Redis |
| Git | Latest | Version control |

## Development Workflow

### Branch Strategy

```
main ────────────────── Production releases
  ├── feature/your-feature ── New features
  ├── bugfix/issue-id ─────── Bug fixes
  └── docs/short-desc ─────── Documentation
```

### Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/description` | `feature/train-alerts` |
| Bugfix | `bugfix/issue-id` | `bugfix/fix-cache-leak` |
| Docs | `docs/description` | `docs/api-reference` |

### Running the Stack

**Full stack (Docker):**
```bash
docker compose up -d
```

**Dev databases only:**
```bash
docker compose -f docker-compose.dev.yml up -d
```

**Backend (local):**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend (local):**
```bash
cd frontend
npm install
npm run dev
```

### Running Tests

```bash
# Backend (17 tests)
cd backend && python -m pytest tests/ -v

# Frontend lint
cd frontend && npm run lint
```

## Coding Standards

### TypeScript / React

- **No `any` types** — all spatial payloads must map to explicit interfaces in `frontend/lib/types.ts`
- **Use `useRef`** for map viewport state, not `useState` (prevents WebGL context re-initialization)
- **Train interface** is named `Train`, not `TrainInfo` (in `frontend/lib/types.ts`)
- Import map instance from `MapContext` via `useMap()` hook

### Python / FastAPI

- **asyncpg only** — no ORM, use raw SQL with parameterized queries
- **Pydantic v2** for all settings and schemas
- Binary protocol: 16-byte frames `[TrainID:4][Lng:4][Lat:4][Bearing:2][Delay:2]`
- Add new endpoints in `backend/app/routers/`, register in `main.py`

### Docker

- 5-service stack: db (PostGIS), redis, tileserver, backend, frontend
- Log rotation: json-file driver, 10m max-size, 3 files
- Health checks on db and redis services

## Adding Features

### New API Endpoint

1. Create route in `backend/app/routers/`
2. Add Pydantic model in `backend/app/schemas/`
3. Register in `backend/app/main.py`: `app.include_router(new_router, prefix=settings.API_V1_STR)`

### New Frontend Component

1. Create in `frontend/components/map/` or `frontend/components/ui/`
2. Use `useMap()` from `MapContext` for map access
3. Import types from `frontend/lib/types.ts`

### New Database Table

1. Create migration in `backend/migrations/`
2. Add dataclass model in `backend/app/models/`
3. Update `backend/app/database.py` if needed

## Pull Request Checklist

Before submitting your PR, verify:

- [ ] Code passes `cd backend && python -m pytest tests/ -v`
- [ ] Code passes `cd frontend && npm run lint`
- [ ] Feature works with `NEXT_PUBLIC_USE_MOCK_TELEMETRY=true`
- [ ] No `any` types in TypeScript code
- [ ] Commits use conventional prefixes (`feat:`, `fix:`, `docs:`, `chore:`)
- [ ] PR description explains what changed and why

## License

By contributing, you agree your contributions will be licensed under the same [ODbL v1.0](https://opendatacommons.org/licenses/odbl/1-0/) license as the project.
