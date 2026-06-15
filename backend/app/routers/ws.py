import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.broadcaster import broadcaster
from app.schemas.websocket import TrainPosition, encode_train_position

logger = logging.getLogger("MapMyTrain.WS")

router = APIRouter(tags=["websocket"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, data: bytes):
        for connection in self.active_connections:
            try:
                await connection.send_bytes(data)
            except Exception:
                pass


manager = ConnectionManager()


@router.websocket("/stream")
async def websocket_stream(websocket: WebSocket):
    """WebSocket endpoint for real-time train positions."""
    await manager.connect(websocket)
    try:
        async for message in broadcaster.subscribe():
            try:
                data = json.loads(message)
                pos = TrainPosition(
                    train_id=int(data.get("train_number", 0)),
                    longitude=float(data.get("longitude", 0)),
                    latitude=float(data.get("latitude", 0)),
                    bearing=int(data.get("bearing", 0)),
                    delay=int(data.get("delay", 0)),
                )
                encoded = encode_train_position(pos)
                await manager.broadcast(encoded)
            except Exception as e:
                logger.error(f"Error processing message: {e}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
