import re
import logging
from typing import Optional
from app.models.train import TrainTelemetry

logger = logging.getLogger("MapMyTrain.Parser")

TRAIN_NUMBER_PATTERN = re.compile(r"^\d{5}$")
STATION_CODE_PATTERN = re.compile(r"^[A-Z]{2,5}$")


def validate_train_number(train_number: str) -> bool:
    """Validate train number is exactly 5 digits."""
    return bool(TRAIN_NUMBER_PATTERN.match(train_number))


def validate_station_code(station_code: str) -> bool:
    """Validate station code is 2-5 uppercase letters."""
    if not station_code:
        return True  # Optional field
    return bool(STATION_CODE_PATTERN.match(station_code))


def validate_telemetry(telemetry: TrainTelemetry) -> bool:
    """Validate telemetry payload has required primitives."""
    if not validate_train_number(telemetry.train_number):
        logger.warning(f"Invalid train number: {telemetry.train_number}")
        return False

    if telemetry.last_station_code and not validate_station_code(telemetry.last_station_code):
        logger.warning(f"Invalid last station code: {telemetry.last_station_code}")
        return False

    if telemetry.next_station_code and not validate_station_code(telemetry.next_station_code):
        logger.warning(f"Invalid next station code: {telemetry.next_station_code}")
        return False

    if not (0 <= telemetry.bearing <= 359):
        logger.warning(f"Invalid bearing: {telemetry.bearing}")
        return False

    if telemetry.delay_minutes < 0:
        logger.warning(f"Invalid delay: {telemetry.delay_minutes}")
        return False

    return True


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
        last_station_match = re.search(r'"lastStation"\s*:\s*"([A-Z]+)"', raw)
        next_station_match = re.search(r'"nextStation"\s*:\s*"([A-Z]+)"', raw)

        telemetry = TrainTelemetry(
            train_number=train_number,
            last_station_code=last_station_match.group(1) if last_station_match else None,
            next_station_code=next_station_match.group(1) if next_station_match else None,
            current_lng=float(lng_match.group(1)) if lng_match else None,
            current_lat=float(lat_match.group(1)) if lat_match else None,
            delay_minutes=int(delay_match.group(1)) if delay_match else 0,
            bearing=int(bearing_match.group(1)) if bearing_match else 0,
        )

        if not validate_telemetry(telemetry):
            return None

        return telemetry
    except Exception as e:
        logger.error(f"Parse error: {e}")
        return None
