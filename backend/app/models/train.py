from dataclasses import dataclass
from typing import Optional


@dataclass
class Train:
    train_number: str
    train_name: str
    source_station_code: Optional[str] = None
    destination_station_code: Optional[str] = None
    runs_on_days: Optional[str] = None


@dataclass
class TrainTelemetry:
    train_number: str
    last_station_code: Optional[str] = None
    next_station_code: Optional[str] = None
    delay_minutes: int = 0
    bearing: int = 0
    current_lng: Optional[float] = None
    current_lat: Optional[float] = None