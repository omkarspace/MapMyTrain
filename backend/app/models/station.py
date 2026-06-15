from dataclasses import dataclass
from typing import Optional


@dataclass
class Station:
    station_code: str
    station_name: str
    division: Optional[str] = None
    zone: Optional[str] = None
    longitude: Optional[float] = None
    latitude: Optional[float] = None