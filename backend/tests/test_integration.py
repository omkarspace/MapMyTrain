import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.dependencies import get_db_connection


@pytest.fixture(autouse=True)
def mock_lifespan():
    with patch("app.main.db_manager") as mock_db, \
         patch("app.main.broadcaster") as mock_bc:
        mock_db.initialize = AsyncMock()
        mock_db.close = AsyncMock()
        mock_bc.initialize = AsyncMock()
        mock_bc.close = AsyncMock()
        yield


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


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
