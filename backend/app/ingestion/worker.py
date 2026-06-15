# backend/app/ingestion/worker.py
import asyncio
import logging
from datetime import datetime
from app.config import settings
from app.services.cache import cache_service
from app.services.broadcaster import broadcaster
from app.ingestion.scraper import fetch_train_status

logger = logging.getLogger("MapMyTrain.Worker")


async def process_train(train_number: str):
    """Fetch and cache a single train's status."""
    today = datetime.now().strftime("%Y%m%d")
    telemetry = await fetch_train_status(train_number, today)

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


async def run_ingestion_loop():
    """Main ingestion loop that periodically fetches active trains."""
    await cache_service.initialize()
    await broadcaster.initialize()

    logger.info("Ingestion worker started.")

    while True:
        try:
            # In production, fetch active train list from database
            # For now, use a placeholder list
            active_trains = ["12301", "12951", "12625"]

            for train_number in active_trains:
                if not await cache_service.is_inactive(train_number):
                    await process_train(train_number)
                    await asyncio.sleep(2)  # Rate limiting between requests

        except Exception as e:
            logger.error(f"Ingestion loop error: {e}")

        await asyncio.sleep(settings.INGESTION_INTERVAL_SECONDS)
