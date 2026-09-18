import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.broadcaster import broadcaster
from app.schemas.websocket import TRAIN_POSITION_SIZE

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
    """WebSocket endpoint for real-time train positions.

    Relays binary frames directly from Redis Pub/Sub to clients.
    """
    global _heartbeat_task
    await manager.connect(websocket)

    if _heartbeat_task is None or _heartbeat_task.done():
        _heartbeat_task = asyncio.create_task(manager.heartbeat())

    try:
        async for message in broadcaster.subscribe():
            if isinstance(message, (bytes, bytearray)) and len(message) == TRAIN_POSITION_SIZE:
                await manager.broadcast(message)
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket)
