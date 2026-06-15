import logging
import asyncpg
from typing import AsyncGenerator
from app.config import settings

logger = logging.getLogger("MapMyTrain.Database")


class DatabaseSessionManager:
    def __init__(self):
        self._pool: asyncpg.Pool | None = None

    async def initialize(self):
        """Creates the persistent connection pool infrastructure on server startup."""
        if self._pool is None:
            try:
                self._pool = await asyncpg.create_pool(
                    dsn=settings.DATABASE_URL,
                    min_size=5,
                    max_size=25,
                    command_timeout=60.0,
                )
                logger.info("PostgreSQL connection pool established successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize PostGIS database connection pool: {e}")
                raise e

    async def close(self):
        """Disconnects the pool cleanly during graceful runtime server shutdowns."""
        if self._pool:
            await self._pool.close()
            self._pool = None
            logger.info("PostgreSQL connection pool released cleanly.")

    async def get_connection(self) -> AsyncGenerator[asyncpg.Connection, None]:
        """Dependency Injection yield function to loan connections to router contexts."""
        if self._pool is None:
            raise RuntimeError("Database connection pool is uninitialized.")

        async with self._pool.acquire() as connection:
            yield connection


# Global engine manager instance
db_manager = DatabaseSessionManager()
