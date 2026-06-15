from typing import AsyncGenerator
import asyncpg
from app.database import db_manager


async def get_db_connection() -> AsyncGenerator[asyncpg.Connection, None]:
    """FastAPI dependency for database connections."""
    async for conn in db_manager.get_connection():
        yield conn
