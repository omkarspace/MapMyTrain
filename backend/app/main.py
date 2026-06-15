import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import db_manager
from app.routers import trains, stations
from app.routers.ws import router as ws_router
from app.services.broadcaster import broadcaster
from app.services.cache import cache_service
from app.ingestion.worker import run_ingestion_loop

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MapMyTrain")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown events."""
    # Startup
    logger.info("Starting MapMyTrain backend...")
    await db_manager.initialize()
    await broadcaster.initialize()
    await cache_service.initialize()

    # Start ingestion worker in background
    ingestion_task = asyncio.create_task(run_ingestion_loop())
    logger.info("Ingestion worker started.")

    logger.info("MapMyTrain backend ready.")
    yield
    # Shutdown
    logger.info("Shutting down MapMyTrain backend...")
    ingestion_task.cancel()
    try:
        await ingestion_task
    except asyncio.CancelledError:
        pass
    await cache_service.close()
    await broadcaster.close()
    await db_manager.close()
    logger.info("MapMyTrain backend stopped.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trains.router, prefix=settings.API_V1_STR)
app.include_router(stations.router, prefix=settings.API_V1_STR)
app.include_router(ws_router, prefix=settings.API_V1_STR)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.VERSION}
