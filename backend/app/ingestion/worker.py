import asyncio
import logging
from datetime import datetime
from app.config import settings
from app.services.cache import cache_service
from app.services.broadcaster import broadcaster
from app.services.rate_limiter import rate_limiter
from app.ingestion.scraper import fetch_with_fallback

logger = logging.getLogger("MapMyTrain.Worker")

# Error tracking
consecutive_failures = 0
MAX_FAILURES_BEFORE_BACKOFF = 5
BASE_BACKOFF_SECONDS = 30


async def process_train(train_number: str, session_cookies: dict) -> dict:
    """Fetch and cache a single train's status. Returns status info."""
    today = datetime.now().strftime("%Y%m%d")
    telemetry = await fetch_with_fallback(train_number, today, session_cookies)

    if telemetry and telemetry.current_lng and telemetry.current_lat:
        data = {
            "train_number": telemetry.train_number,
            "longitude": telemetry.current_lng,
            "latitude": telemetry.current_lat,
            "bearing": telemetry.bearing,
            "delay": telemetry.delay_minutes,
        }
        await cache_service.set_train_data(train_number, data)
        await broadcaster.publish(train_number, data)
        return {"status": "success", "train": train_number}

    return {"status": "failed", "train": train_number}


async def handle_error(error_type: str, train_number: str):
    """Handle different error types according to recovery matrix."""
    global consecutive_failures

    if error_type == "403":
        logger.warning(f"HTTP 403 for {train_number} - IP blocked or cookie invalid")
        await rate_limiter.set_cooldown(train_number, seconds=60)
        consecutive_failures += 1

    elif error_type == "429":
        logger.warning(f"HTTP 429 for {train_number} - Rate limit exceeded")
        await rate_limiter.increase_ttl(train_number, multiplier=2)
        consecutive_failures += 1

    elif error_type == "json_error":
        logger.error(f"JSON parse error for {train_number} - API schema changed")
        await rate_limiter.set_cooldown(train_number, seconds=300)
        consecutive_failures += 1

    elif error_type == "network":
        logger.error(f"Network error for {train_number}")
        consecutive_failures += 1

    else:
        logger.error(f"Unknown error for {train_number}: {error_type}")
        consecutive_failures += 1


async def get_backoff_seconds() -> int:
    """Calculate exponential backoff based on consecutive failures."""
    if consecutive_failures >= MAX_FAILURES_BEFORE_BACKOFF:
        return BASE_BACKOFF_SECONDS * (2 ** (consecutive_failures - MAX_FAILURES_BEFORE_BACKOFF))
    return 0


async def run_ingestion_loop():
    """Main ingestion loop with error recovery and rate limiting."""
    global consecutive_failures

    await cache_service.initialize()
    await broadcaster.initialize()
    await rate_limiter.initialize()

    logger.info("Ingestion worker started with rate limiter and error recovery.")

    # Fetch initial session cookies
    from app.ingestion.scraper import fetch_session_cookies
    import httpx

    session_cookies = {}
    try:
        async with httpx.AsyncClient() as client:
            session_cookies = await fetch_session_cookies(client)
    except Exception as e:
        logger.warning(f"Initial cookie handshake failed: {e}")

    while True:
        try:
            active_trains = ["12301", "12951", "12625"]

            for train_number in active_trains:
                # Check rate limiter
                if not await rate_limiter.acquire(train_number):
                    logger.debug(f"Rate limited for train {train_number}")
                    continue

                # Process train with error handling
                try:
                    result = await process_train(train_number, session_cookies)
                    if result["status"] == "success":
                        consecutive_failures = 0
                        logger.debug(f"Successfully processed train {train_number}")
                    else:
                        await handle_error("network", train_number)
                except Exception as e:
                    error_msg = str(e).lower()
                    if "403" in error_msg:
                        await handle_error("403", train_number)
                        # Refresh cookies on 403
                        try:
                            async with httpx.AsyncClient() as client:
                                session_cookies = await fetch_session_cookies(client)
                        except Exception:
                            pass
                    elif "429" in error_msg:
                        await handle_error("429", train_number)
                    elif "json" in error_msg or "parse" in error_msg:
                        await handle_error("json_error", train_number)
                    else:
                        await handle_error("network", train_number)

                await asyncio.sleep(2)  # Delay between requests

        except Exception as e:
            logger.error(f"Ingestion loop error: {e}")

        # Apply backoff if too many failures
        backoff = await get_backoff_seconds()
        if backoff > 0:
            logger.info(f"Backing off for {backoff}s (consecutive failures: {consecutive_failures})")
            await asyncio.sleep(backoff)
        else:
            await asyncio.sleep(settings.INGESTION_INTERVAL_SECONDS)
