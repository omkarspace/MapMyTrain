import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.dependencies import get_db_connection


@pytest.fixture(autouse=True)
def mock_lifespan():
    with patch("app.main.db_manager") as mock_db, \
         patch("app.main.broadcaster") as mock_bc, \
         patch("app.main.cache_service") as mock_cache:
        mock_db.initialize = AsyncMock()
        mock_db.close = AsyncMock()
        mock_bc.initialize = AsyncMock()
        mock_bc.close = AsyncMock()
        mock_cache.initialize = AsyncMock()
        mock_cache.close = AsyncMock()
        yield


@pytest.mark.asyncio
async def test_health_endpoint():
    with patch("app.main.db_manager") as mock_db, \
         patch("app.main.get_redis_client") as mock_redis_get:
        mock_conn = AsyncMock()
        mock_conn.fetchval = AsyncMock(return_value=1)
        mock_db.get_connection.return_value.__aenter__ = AsyncMock(return_value=mock_conn)
        mock_db.get_connection.return_value.__aexit__ = AsyncMock(return_value=False)

        mock_redis = AsyncMock()
        mock_redis.ping = AsyncMock(return_value=True)
        mock_redis_get.return_value = mock_redis

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/health")
            assert response.status_code == 200
            body = response.json()
            assert body["status"] == "healthy"
            assert body["checks"]["database"] == "ok"
            assert body["checks"]["redis"] == "ok"


@pytest.mark.asyncio
async def test_trains_endpoint():
    mock_conn = AsyncMock()
    mock_conn.fetch = AsyncMock(return_value=[])
    mock_conn.fetchval = AsyncMock(return_value=0)

    async def override_get_db():
        yield mock_conn

    app.dependency_overrides[get_db_connection] = override_get_db
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/trains/")
            assert response.status_code == 200
            assert "trains" in response.json()
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_stations_endpoint():
    mock_conn = AsyncMock()
    mock_conn.fetch = AsyncMock(return_value=[])
    mock_conn.fetchval = AsyncMock(return_value=0)

    async def override_get_db():
        yield mock_conn

    app.dependency_overrides[get_db_connection] = override_get_db
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/stations/")
            assert response.status_code == 200
            assert "stations" in response.json()
    finally:
        app.dependency_overrides.clear()
