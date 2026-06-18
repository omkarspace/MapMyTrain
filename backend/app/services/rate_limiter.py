import time
import logging
from app.services.redis_client import get_redis_client

logger = logging.getLogger("MapMyTrain.RateLimiter")

TOKEN_BUCKET_KEY = "ingestion:tokens"
TOKEN_REFILL_RATE = 1
MAX_TOKENS = 5

REFILL_SCRIPT = """
local current = tonumber(redis.call('GET', KEYS[1]) or ARGV[2])
local elapsed = tonumber(ARGV[1])
local tokens_to_add = math.floor(elapsed * ARGV[3])
local new_tokens = math.min(ARGV[2], current + tokens_to_add)
redis.call('SET', KEYS[1], new_tokens)
return new_tokens
"""

ACQUIRE_SCRIPT = """
local tokens = tonumber(redis.call('GET', KEYS[1]) or '0')
if tokens > 0 then
    redis.call('DECR', KEYS[1])
    return 1
end
return 0
"""


class RateLimiter:
    """Redis-based token bucket rate limiter using atomic Lua scripts."""

    def __init__(self):
        self._last_refill = time.time()
        self._client = None
        self._refill_sha = None
        self._acquire_sha = None

    async def initialize(self):
        """Initialize token bucket with max tokens."""
        self._client = await get_redis_client()
        if self._client:
            self._refill_sha = await self._client.script_load(REFILL_SCRIPT)
            self._acquire_sha = await self._client.script_load(ACQUIRE_SCRIPT)
            await self._client.set(TOKEN_BUCKET_KEY, str(MAX_TOKENS))
            self._last_refill = time.time()
            logger.info("Rate limiter initialized with atomic scripts.")

    async def _refill_tokens(self):
        """Refill tokens atomically based on elapsed time."""
        if not self._client or not self._refill_sha:
            return
        now = time.time()
        elapsed = now - self._last_refill
        if elapsed > 0:
            await self._client.evalsha(
                self._refill_sha,
                1,
                TOKEN_BUCKET_KEY,
                str(elapsed),
                str(TOKEN_REFILL_RATE),
                str(MAX_TOKENS),
            )
            self._last_refill = now

    async def acquire(self, train_number: str) -> bool:
        """Try to acquire a token atomically."""
        if not self._client:
            return True

        await self._refill_tokens()

        cooldown_key = f"ingestion:cooldown:{train_number}"
        if await self._client.exists(cooldown_key):
            logger.debug(f"Train {train_number} in cooldown, skipping.")
            return False

        if self._acquire_sha:
            result = await self._client.evalsha(
                self._acquire_sha, 1, TOKEN_BUCKET_KEY
            )
            return result == 1

        tokens = await self._client.get(TOKEN_BUCKET_KEY)
        if tokens and int(tokens) > 0:
            await self._client.decr(TOKEN_BUCKET_KEY)
            return True

        logger.debug("No tokens available in rate limiter.")
        return False

    async def set_cooldown(self, train_number: str, seconds: int = 120):
        """Set a cooldown period for a specific train."""
        if self._client:
            cooldown_key = f"ingestion:cooldown:{train_number}"
            await self._client.setex(cooldown_key, seconds, "1")
            logger.debug(f"Set {seconds}s cooldown for train {train_number}")

    async def increase_ttl(self, train_number: str, multiplier: int = 2):
        """Increase TTL for a train (for 429 responses)."""
        if self._client:
            cooldown_key = f"ingestion:cooldown:{train_number}"
            current_ttl = await self._client.ttl(cooldown_key)
            if current_ttl > 0:
                new_ttl = current_ttl * multiplier
                await self._client.expire(cooldown_key, new_ttl)
                logger.info(
                    f"Increased cooldown for {train_number} to {new_ttl}s (429 response)"
                )


rate_limiter = RateLimiter()
