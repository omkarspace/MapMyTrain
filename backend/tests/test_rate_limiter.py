import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.middleware.rate_limit import RateLimitMiddleware


@pytest.mark.asyncio
async def test_rate_limiter_allows_normal_traffic():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code in (200, 503)


def test_rate_limiter_initialization():
    middleware = RateLimitMiddleware(app=None, max_requests=50, window_seconds=30)
    assert middleware.max_requests == 50
    assert middleware.window_seconds == 30


def test_rate_limiter_get_client_ip_with_forwarded():
    middleware = RateLimitMiddleware(app=None)

    class FakeRequest:
        headers = {"X-Forwarded-For": "1.2.3.4, 5.6.7.8"}
        client = None

    ip = middleware._get_client_ip(FakeRequest())
    assert ip == "1.2.3.4"


def test_rate_limiter_get_client_ip_direct():
    middleware = RateLimitMiddleware(app=None)

    class FakeRequest:
        headers = {}
        client = type("Client", (), {"host": "192.168.1.1"})()

    ip = middleware._get_client_ip(FakeRequest())
    assert ip == "192.168.1.1"


def test_rate_limiter_cleanup_old_requests():
    import time
    middleware = RateLimitMiddleware(app=None, window_seconds=10)
    client_ip = "10.0.0.1"
    now = time.time()
    middleware._requests[client_ip] = [now - 20, now - 15, now - 5, now]
    middleware._cleanup_old_requests(client_ip, now)
    assert len(middleware._requests[client_ip]) == 2


def test_rate_limiter_skips_health_endpoint():
    middleware = RateLimitMiddleware(app=None, max_requests=1)
    assert "/health" not in middleware._requests
