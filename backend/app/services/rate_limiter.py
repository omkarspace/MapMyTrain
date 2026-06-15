import time
import logging
from typing import Optional
from app.services.cache import cache_service

logger = logging.getLogger("MapMyTrain.RateLimiter")

RATE_LIMIT_KEY = "ingestion:rate_limit"
TOKEN_BUCKET_KEY = "ingestion:tokens"
TOKEN_REFILL_RATE = 1  # tokens per second
MAX_TOKENS = 5


class RateLimiter:
    """Redis-based token bucket rate limiter for ingestion requests."""

    def __init__(self):
        self._last_refill = time.time()

    async def _refill_tokens(self):
        """Refill tokens based on elapsed time."""
        now = time.time()
        elapsed = now - self._last_refill
        tokens_to_add = int(elapsed * TOKEN_REFILL_RATE)

        if tokens_to_add > 0:
            client = cache_service._client
            if client:
                current = await client.get(TOKEN_BUCKET_KEY)
                current_tokens = int(current) if current else MAX_TOKENS
                new_tokens = min(MAX_TOKENS, current_tokens + tokens_to_add)
                await client.set(TOKEN_BUCKET_KEY, str(new_tokens))
                self._last_refill = now

    async def acquire(self, train_number: str) -> bool:
        """Try to acquire a token for the request."""
        await self._refill_tokens()

        client = cache_service._client
        if not client:
            return True

        # Check per-train cooldown
        cooldown_key = f"ingestion:cooldown:{train_number}"
        if await client.exists(cooldown_key):
            logger.debug(f"Train {train_number} in cooldown, skipping.")
            return False

        # Check global token bucket
        tokens = await client.get(TOKEN_BUCKET_KEY)
        if tokens and int(tokens) > 0:
            await client.decr(TOKEN_BUCKET_KEY)
            return True

        logger.debug("No tokens available in rate limiter.")
        return False

    async def set_cooldown(self, train_number: str, seconds: int = 120):
        """Set a cooldown period for a specific train."""
        client = cache_service._client
        if client:
            cooldown_key = f"ingestion:cooldown:{train_number}"
            await client.setex(cooldown_key, seconds, "1")
            logger.debug(f"Set {seconds}s cooldown for train {train_number}")

    async def increase_ttl(self, train_number: str, multiplier: int = 2):
        """Increase TTL for a train (for 429 responses)."""
        client = cache_service._client
        if client:
            cooldown_key = f"ingestion:cooldown:{train_number}"
            current_ttl = await client.ttl(cooldown_key)
            if current_ttl > 0:
                new_ttl = current_ttl * multiplier
                await client.expire(cooldown_key, new_ttl)
                logger.info(
                    f"Increased cooldown for {train_number} to {new_ttl}s (429 response)"
                )

    async def initialize(self):
        """Initialize token bucket with max tokens."""
        client = cache_service._client
        if client:
            await client.set(TOKEN_BUCKET_KEY, str(MAX_TOKENS))
            self._last_refill = time.time()
            logger.info("Rate limiter initialized.")


rate_limiter = RateLimiter()
