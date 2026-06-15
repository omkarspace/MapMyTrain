import asyncio
import logging
from app.database import db_manager

logger = logging.getLogger("MapMyTrain.Cleanup")

CLEANUP_INTERVAL_SECONDS = 3600  # Run every hour


async def clean_expired_telemetry():
    """Delete telemetry logs older than 48 hours."""
    try:
        async with db_manager._pool.acquire() as conn:
            result = await conn.execute(
                "DELETE FROM train_telemetry_logs WHERE captured_at < NOW() - INTERVAL '48 hours'"
            )
            deleted = int(result.split()[-1])
            if deleted > 0:
                logger.info(f"Cleaned up {deleted} expired telemetry records.")
    except Exception as e:
        logger.error(f"Telemetry cleanup failed: {e}")


async def run_cleanup_loop():
    """Background loop that periodically cleans expired telemetry."""
    logger.info("Telemetry cleanup worker started.")
    while True:
        await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
        await clean_expired_telemetry()
