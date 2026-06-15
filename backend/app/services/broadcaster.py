import logging
import json
from typing import AsyncGenerator
import redis.asyncio as redis
from app.config import settings

logger = logging.getLogger("MapMyTrain.Broadcaster")

REDIS_CHANNEL = "train:updates"


class Broadcaster:
    def __init__(self):
        self.redis_url = settings.REDIS_URL
        self._client: redis.Redis | None = None

    async def initialize(self):
        """Create Redis connection for pub/sub."""
        if self._client is None:
            self._client = redis.from_url(self.redis_url, decode_responses=True)
            logger.info("Broadcaster Redis connection established.")

    async def close(self):
        """Close Redis connection."""
        if self._client:
            await self._client.close()
            self._client = None

    async def publish(self, train_number: str, data: dict) -> None:
        """Publish train update to Redis channel."""
        if not self._client:
            return
        message = json.dumps({"train_number": train_number, **data})
        await self._client.publish(REDIS_CHANNEL, message)

    async def subscribe(self) -> AsyncGenerator[str, None]:
        """Subscribe to train updates channel."""
        if not self._client:
            return
        pubsub = self._client.pubsub()
        await pubsub.subscribe(REDIS_CHANNEL)
        async for message in pubsub.listen():
            if message["type"] == "message":
                yield message["data"]


# Global broadcaster instance
broadcaster = Broadcaster()
