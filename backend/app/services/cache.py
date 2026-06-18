import json
import logging
from typing import Optional
import redis.asyncio as redis
from app.services.redis_client import get_redis_client

logger = logging.getLogger("MapMyTrain.Cache")

TRAIN_TTL_SECONDS = 120


class CacheService:
    def __init__(self):
        self._client: Optional[redis.Redis] = None

    async def initialize(self):
        """Get shared Redis connection."""
        if self._client is None:
            self._client = await get_redis_client()
            logger.info("Redis cache connection established.")

    async def close(self):
        """No-op - shared client is closed by redis_client."""
        self._client = None

    def _train_key(self, train_number: str) -> str:
        return f"train:{train_number}:raw"

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


cache_service = CacheService()
