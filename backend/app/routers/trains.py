from fastapi import APIRouter, Depends, Query, HTTPException
import asyncpg
from app.dependencies import get_db_connection
from app.schemas.train import TrainResponse, TrainListResponse

router = APIRouter(prefix="/trains", tags=["trains"])


@router.get("/", response_model=TrainListResponse)
async def list_trains(
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    conn: asyncpg.Connection = Depends(get_db_connection),
):
    """List all trains with pagination."""
    rows = await conn.fetch(
        "SELECT train_number, train_name, source_station_code, destination_station_code, runs_on_days "
        "FROM trains ORDER BY train_number LIMIT $1 OFFSET $2",
        limit,
        offset,
    )
    trains = [TrainResponse(**dict(row)) for row in rows]
    count = await conn.fetchval("SELECT COUNT(*) FROM trains")
    return TrainListResponse(trains=trains, count=count)


@router.get("/search/{query}", response_model=TrainListResponse)
async def search_trains(
    query: str,
    conn: asyncpg.Connection = Depends(get_db_connection),
):
    """Search trains by number or name."""
    rows = await conn.fetch(
        "SELECT train_number, train_name, source_station_code, destination_station_code, runs_on_days "
        "FROM trains WHERE train_number LIKE $1 OR train_name ILIKE $1 "
        "ORDER BY train_number LIMIT 50",
        f"%{query}%",
    )
    trains = [TrainResponse(**dict(row)) for row in rows]
    return TrainListResponse(trains=trains, count=len(trains))


@router.get("/{train_number}", response_model=TrainResponse)
async def get_train(
    train_number: str,
    conn: asyncpg.Connection = Depends(get_db_connection),
):
    """Get a specific train by number."""
    row = await conn.fetchrow(
        "SELECT train_number, train_name, source_station_code, destination_station_code, runs_on_days "
        "FROM trains WHERE train_number = $1",
        train_number,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Train not found")
    return TrainResponse(**dict(row))
