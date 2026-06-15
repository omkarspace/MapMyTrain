# backend/app/ingestion/parser.py
import re
from typing import Optional
from app.models.train import TrainTelemetry


def parse_ntes_response(raw: str) -> Optional[TrainTelemetry]:
    """Parse raw NTES API response string into TrainTelemetry."""
    try:
        train_number_match = re.search(r'"trainNumber"\s*:\s*"(\d+)"', raw)
        if not train_number_match:
            return None
        train_number = train_number_match.group(1)

        lat_match = re.search(r'"latitude"\s*:\s*([0-9.]+)', raw)
        lng_match = re.search(r'"longitude"\s*:\s*([0-9.]+)', raw)
        delay_match = re.search(r'"delay"\s*:\s*(\d+)', raw)
        bearing_match = re.search(r'"bearing"\s*:\s*(\d+)', raw)

        return TrainTelemetry(
            train_number=train_number,
            current_lng=float(lng_match.group(1)) if lng_match else None,
            current_lat=float(lat_match.group(1)) if lat_match else None,
            delay_minutes=int(delay_match.group(1)) if delay_match else 0,
            bearing=int(bearing_match.group(1)) if bearing_match else 0,
        )
    except Exception:
        return None
