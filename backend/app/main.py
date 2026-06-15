import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import db_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MapMyTrain")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown events."""
    # Startup
    logger.info("Starting MapMyTrain backend...")
    await db_manager.initialize()
    logger.info("MapMyTrain backend ready.")
    yield
    # Shutdown
    logger.info("Shutting down MapMyTrain backend...")
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


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.VERSION}
