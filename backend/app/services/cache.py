import json
import logging
from typing import Any, Optional
import redis.asyncio as redis
from app.config import settings

logger = logging.getLogger("MapMyTrain.Cache")

TRAIN_TTL_SECONDS = 120
INACTIVE_TRAIN_TTL_SECONDS = 1800  # 30 minutes


class CacheService:
    def __init__(self):
        self.redis_url = settings.REDIS_URL
        self._client: Optional[redis.Redis] = None

    async def initialize(self):
        """Create Redis connection."""
        if self._client is None:
            self._client = redis.from_url(
                self.redis_url,
                decode_responses=True,
            )
            logger.info("Redis cache connection established.")

    async def close(self):
        """Close Redis connection."""
        if self._client:
            await self._client.close()
            self._client = None

    def _train_key(self, train_number: str) -> str:
        return f"train:{train_number}:raw"

    def _inactive_key(self, train_number: str) -> str:
        return f"train:{train_number}:inactive"

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

    async def mark_inactive(self, train_number: str) -> None:
        """Mark train as inactive with longer TTL."""
        if not self._client:
            return
        key = self._inactive_key(train_number)
        await self._client.setex(key, INACTIVE_TRAIN_TTL_SECONDS, "1")

    async def is_inactive(self, train_number: str) -> bool:
        """Check if train is marked inactive."""
        if not self._client:
            return False
        key = self._inactive_key(train_number)
        return await self._client.exists(key) > 0


# Global cache instance
cache_service = CacheService()
