import asyncio
import logging
import random
from datetime import datetime
from app.config import settings
from app.database import db_manager
from app.services.cache import cache_service
from app.services.broadcaster import broadcaster
from app.services.rate_limiter import rate_limiter
from app.services.state_machine import state_machine
from app.ingestion.scraper import fetch_with_fallback, ScraperHTTPError

logger = logging.getLogger("MapMyTrain.Worker")

MAX_FAILURES_BEFORE_BACKOFF = 5
BASE_BACKOFF_SECONDS = 30
MAX_BACKOFF_SECONDS = 600
TELEMETRY_BATCH_SIZE = 100


class IngestionState:
    """Encapsulates mutable ingestion state."""

    def __init__(self):
        self.consecutive_failures = 0

    def record_success(self):
        self.consecutive_failures = 0

    def record_failure(self):
        self.consecutive_failures += 1

    def get_backoff_seconds(self) -> int:
        if self.consecutive_failures >= MAX_FAILURES_BEFORE_BACKOFF:
            exponential = BASE_BACKOFF_SECONDS * (2 ** (self.consecutive_failures - MAX_FAILURES_BEFORE_BACKOFF))
            return min(exponential, MAX_BACKOFF_SECONDS)
        return 0


_state = IngestionState()


async def get_active_trains() -> list[str]:
    """Dynamically discover active trains from the database."""
    try:
        async with db_manager.get_connection() as conn:
            rows = await conn.fetch(
                "SELECT train_number FROM trains ORDER BY train_number LIMIT $1",
                200,
            )
            return [row["train_number"] for row in rows]
    except Exception as e:
        logger.error(f"Failed to fetch active trains from DB: {e}")
        return []


async def persist_telemetry(train_number: str, data: dict):
    """Persist telemetry data to the database for historical analysis."""
    try:
        async with db_manager.get_connection() as conn:
            await conn.execute(
                """INSERT INTO train_telemetry_logs (train_number, current_location, bearing, delay_minutes, captured_at)
                   VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, NOW())""",
                train_number,
                data["longitude"],
                data["latitude"],
                data["bearing"],
                data["delay"],
            )
    except Exception as e:
        logger.warning(f"Failed to persist telemetry for {train_number}: {e}")


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
        await persist_telemetry(train_number, data)
        return {"status": "success", "train": train_number}

    return {"status": "failed", "train": train_number}


async def handle_error(error_type: str, train_number: str):
    """Handle different error types according to recovery matrix."""
    if error_type == "403":
        logger.warning(f"HTTP 403 for {train_number} - IP blocked or cookie invalid")
        await rate_limiter.set_cooldown(train_number, seconds=60)

    elif error_type == "429":
        logger.warning(f"HTTP 429 for {train_number} - Rate limit exceeded")
        await rate_limiter.increase_ttl(train_number, multiplier=2)

    elif error_type == "json_error":
        logger.error(f"JSON parse error for {train_number} - API schema changed")
        await rate_limiter.set_cooldown(train_number, seconds=300)

    elif error_type == "network":
        logger.error(f"Network error for {train_number}")

    else:
        logger.error(f"Unknown error for {train_number}: {error_type}")

    _state.record_failure()


async def run_ingestion_loop():
    """Main ingestion loop with error recovery and rate limiting."""
    await cache_service.initialize()
    await broadcaster.initialize()
    await rate_limiter.initialize()

    logger.info("Ingestion worker started with rate limiter and error recovery.")

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
            active_trains = await get_active_trains()
            if not active_trains:
                logger.warning("No active trains found in database, skipping cycle")
                await asyncio.sleep(settings.INGESTION_INTERVAL_SECONDS)
                continue

            random.shuffle(active_trains)

            for train_number in active_trains:
                if not await rate_limiter.acquire(train_number):
                    logger.debug(f"Rate limited for train {train_number}")
                    continue

                if not await state_machine.is_train_viewed(train_number):
                    logger.debug(f"Train {train_number} not viewed, skipping")
                    continue

                try:
                    result = await process_train(train_number, session_cookies)
                    if result["status"] == "success":
                        _state.record_success()
                        logger.debug(f"Successfully processed train {train_number}")
                    else:
                        await handle_error("network", train_number)
                except ScraperHTTPError as e:
                    if e.status_code == 403:
                        await handle_error("403", train_number)
                        try:
                            async with httpx.AsyncClient() as client:
                                session_cookies = await fetch_session_cookies(client)
                        except Exception:
                            pass
                    elif e.status_code == 429:
                        await handle_error("429", train_number)
                    else:
                        await handle_error("network", train_number)
                except Exception as e:
                    error_msg = str(e).lower()
                    if "json" in error_msg or "parse" in error_msg:
                        await handle_error("json_error", train_number)
                    else:
                        await handle_error("network", train_number)

                await asyncio.sleep(2)

        except Exception as e:
            logger.error(f"Ingestion loop error: {e}")
            _state.record_failure()

        backoff = _state.get_backoff_seconds()
        if backoff > 0:
            logger.info(f"Backing off for {backoff}s (consecutive failures: {_state.consecutive_failures})")
            await asyncio.sleep(backoff)
        else:
            await asyncio.sleep(settings.INGESTION_INTERVAL_SECONDS)
