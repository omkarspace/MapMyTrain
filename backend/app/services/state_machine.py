import json
import logging
from typing import Optional, Set
from app.services.cache import cache_service

logger = logging.getLogger("MapMyTrain.StateMachine")

VIEWPORT_KEY = "viewport:active_trains"
VIEWPORT_TTL = 300  # 5 minutes


class StateMachineCache:
    """Tracks active browser viewport cluster sizes to adjust calculation intervals."""

    def __init__(self):
        self._active_viewports: dict[str, Set[str]] = {}  # session_id -> train_numbers

    async def register_viewport(self, session_id: str, train_numbers: list[str]):
        """Register which trains a viewport is currently viewing."""
        client = cache_service._client
        if not client:
            return

        self._active_viewports[session_id] = set(train_numbers)

        # Update Redis set of all active trains across all viewports
        all_active = set()
        for trains in self._active_viewports.values():
            all_active.update(trains)

        if all_active:
            await client.delete(VIEWPORT_KEY)
            for train in all_active:
                await client.sadd(VIEWPORT_KEY, train)
            await client.expire(VIEWPORT_KEY, VIEWPORT_TTL)

    async def unregister_viewport(self, session_id: str):
        """Remove a viewport from tracking."""
        self._active_viewports.pop(session_id, None)

    async def is_train_viewed(self, train_number: str) -> bool:
        """Check if any viewport is currently viewing this train."""
        client = cache_service._client
        if not client:
            return True  # Default to processing if unknown

        return await client.sismember(VIEWPORT_KEY, train_number)

    async def get_active_train_count(self) -> int:
        """Get total number of trains being viewed across all viewports."""
        client = cache_service._client
        if not client:
            return 0

        return await client.scard(VIEWPORT_KEY)


state_machine = StateMachineCache()
