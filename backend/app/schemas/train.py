from pydantic import BaseModel
from typing import Optional


class TrainResponse(BaseModel):
    train_number: str
    train_name: str
    source_station_code: Optional[str] = None
    destination_station_code: Optional[str] = None
    runs_on_days: Optional[str] = None


class TrainSearchRequest(BaseModel):
    query: str


class TrainListResponse(BaseModel):
    trains: list[TrainResponse]
    count: int