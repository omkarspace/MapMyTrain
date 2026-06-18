import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.broadcaster import broadcaster
from app.schemas.websocket import TrainPosition, encode_train_position

logger = logging.getLogger("MapMyTrain.WS")

router = APIRouter(tags=["websocket"])

HEARTBEAT_INTERVAL = 30


class ConnectionManager:
    def __init__(self):
        self.active_connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, data: bytes):
        dead = set()
        for connection in self.active_connections:
            try:
                await connection.send_bytes(data)
            except Exception:
                dead.add(connection)
        self.active_connections -= dead

    async def heartbeat(self):
        """Send periodic pings to detect dead connections."""
        while True:
            await asyncio.sleep(HEARTBEAT_INTERVAL)
            dead = set()
            for connection in self.active_connections:
                try:
                    await connection.send_text("ping")
                except Exception:
                    dead.add(connection)
            if dead:
                self.active_connections -= dead
                logger.info(f"Cleaned {len(dead)} dead connections. Total: {len(self.active_connections)}")


manager = ConnectionManager()
_heartbeat_task: asyncio.Task | None = None


@router.websocket("/stream")
async def websocket_stream(websocket: WebSocket):
    """WebSocket endpoint for real-time train positions."""
    global _heartbeat_task
    await manager.connect(websocket)

    if _heartbeat_task is None or _heartbeat_task.done():
        _heartbeat_task = asyncio.create_task(manager.heartbeat())

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
        pass
    finally:
        manager.disconnect(websocket)
