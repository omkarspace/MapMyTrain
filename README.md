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

## Architecture

- **Frontend**: Next.js 14 + MapLibre GL JS WebGL canvas
- **Backend**: FastAPI + WebSocket streaming
- **Database**: PostgreSQL 16 + PostGIS 3.4
- **Cache**: Redis 7.2
- **Ingestion**: NTES API scraper with rate limiting

## License

Open-source core with proprietary premium features.