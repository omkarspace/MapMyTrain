import logging
import redis.asyncio as redis
from app.config import settings

logger = logging.getLogger("MapMyTrain.Redis")

_shared_client: redis.Redis | None = None


async def get_redis_client() -> redis.Redis:
    """Get or create a shared Redis client."""
    global _shared_client
    if _shared_client is None:
        _shared_client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            max_connections=20,
        )
        logger.info("Shared Redis client created.")
    return _shared_client


async def close_redis_client():
    """Close the shared Redis client."""
    global _shared_client
    if _shared_client:
        await _shared_client.close()
        _shared_client = None
        logger.info("Shared Redis client closed.")
