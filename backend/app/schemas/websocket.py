import struct
from pydantic import BaseModel
from typing import Optional


class TrainPosition(BaseModel):
    train_id: int
    longitude: float
    latitude: float
    bearing: int
    delay: int


# Binary protocol: [TrainID:4][Lng:4][Lat:4][Bearing:2][Delay:2] = 16 bytes
TRAIN_POSITION_FORMAT = "!iffhh"  # Network byte order, int32, float32, float32, int16, int16
TRAIN_POSITION_SIZE = 16


def encode_train_position(pos: TrainPosition) -> bytes:
    """Encode train position to binary format."""
    return struct.pack(
        TRAIN_POSITION_FORMAT,
        pos.train_id,
        pos.longitude,
        pos.latitude,
        pos.bearing,
        pos.delay,
    )


def decode_train_position(data: bytes) -> TrainPosition:
    """Decode binary data to train position."""
    train_id, lng, lat, bearing, delay = struct.unpack(TRAIN_POSITION_FORMAT, data)
    return TrainPosition(
        train_id=train_id,
        longitude=lng,
        latitude=lat,
        bearing=bearing,
        delay=delay,
    )