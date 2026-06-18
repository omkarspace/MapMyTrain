import asyncio
import logging
from app.database import db_manager

logger = logging.getLogger("MapMyTrain.Cleanup")

CLEANUP_INTERVAL_SECONDS = 3600
BATCH_SIZE = 10000


async def clean_expired_telemetry():
    """Delete telemetry logs older than 48 hours in batches."""
    try:
        total_deleted = 0
        while True:
            async with db_manager.get_connection() as conn:
                result = await conn.execute(
                    "DELETE FROM train_telemetry_logs "
                    "WHERE id IN ("
                    "  SELECT id FROM train_telemetry_logs "
                    "  WHERE captured_at < NOW() - INTERVAL '48 hours' "
                    f"  LIMIT {BATCH_SIZE}"
                    ")"
                )
                deleted = int(result.split()[-1])
                total_deleted += deleted
                if deleted < BATCH_SIZE:
                    break
                await asyncio.sleep(0.1)

        if total_deleted > 0:
            logger.info(f"Cleaned up {total_deleted} expired telemetry records.")
    except Exception as e:
        logger.error(f"Telemetry cleanup failed: {e}")


async def run_cleanup_loop():
    """Background loop that periodically cleans expired telemetry."""
    logger.info("Telemetry cleanup worker started.")
    while True:
        await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
        await clean_expired_telemetry()
