from dataclasses import dataclass
from typing import Optional


@dataclass
class Track:
    id: int
    osm_id: Optional[int] = None
    gauge: str = "broad"
    electrified: bool = True
    tracks_count: int = 2
    geom_wkt: Optional[str] = None