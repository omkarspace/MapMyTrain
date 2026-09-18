import logging
from typing import AsyncGenerator
import redis.asyncio as redis
from app.services.redis_client import get_redis_client
from app.schemas.websocket import encode_train_position, TrainPosition

logger = logging.getLogger("MapMyTrain.Broadcaster")

REDIS_CHANNEL = "train:updates"


class Broadcaster:
    def __init__(self):
        self._client: redis.Redis | None = None

    async def initialize(self):
        """Get shared Redis connection for pub/sub."""
        if self._client is None:
            self._client = await get_redis_client()
            logger.info("Broadcaster Redis connection established.")

    async def close(self):
        """No-op - shared client is closed by redis_client."""
        self._client = None

    async def publish(self, train_number: str, data: dict) -> None:
        """Publish train update to Redis channel as binary."""
        if not self._client:
            return
        # Convert to binary format directly
        pos = TrainPosition(
            train_id=int(train_number),
            longitude=data["longitude"],
            latitude=data["latitude"],
            bearing=data["bearing"],
            delay=data["delay"],
        )
        binary_data = encode_train_position(pos)
        await self._client.publish(REDIS_CHANNEL, binary_data)

    async def subscribe(self) -> AsyncGenerator[bytes, None]:
        """Subscribe to train updates channel, yielding binary frames."""
        if not self._client:
            return
        pubsub = self._client.pubsub()
        await pubsub.subscribe(REDIS_CHANNEL)
        async for message in pubsub.listen():
            if message["type"] == "message" and isinstance(message["data"], (bytes, bytearray)):
                yield message["data"]


broadcaster = Broadcaster()
