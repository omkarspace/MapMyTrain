# backend/app/ingestion/scraper.py
import random
import logging
import httpx
from typing import Optional
from app.ingestion.parser import parse_ntes_response
from app.models.train import TrainTelemetry

logger = logging.getLogger("MapMyTrain.Scraper")

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
]

NTES_BASE_URL = "https://ntes.indianrail.gov.in/Coreata"
NTES_QUERY_PATH = "/QueryResult?queryType=LiveTrainStatus&trainNo={train_number}&date={date}"


async def fetch_train_status(train_number: str, date: str) -> Optional[TrainTelemetry]:
    """Fetch live train status from NTES."""
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": NTES_BASE_URL,
        "Referer": f"{NTES_BASE_URL}/",
    }

    url = f"{NTES_BASE_URL}{NTES_QUERY_PATH.format(train_number=train_number, date=date)}"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, timeout=10.0)
            response.raise_for_status()
            return parse_ntes_response(response.text)
    except httpx.HTTPStatusError as e:
        logger.warning(f"HTTP {e.response.status_code} for train {train_number}")
        return None
    except Exception as e:
        logger.error(f"Scraper error for train {train_number}: {e}")
        return None
