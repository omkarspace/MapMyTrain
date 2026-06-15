from fastapi import APIRouter, Depends, Query, HTTPException
import asyncpg
from app.dependencies import get_db_connection

router = APIRouter(prefix="/stations", tags=["stations"])


@router.get("/")
async def list_stations(
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    conn: asyncpg.Connection = Depends(get_db_connection),
):
    """List all stations with pagination."""
    rows = await conn.fetch(
        "SELECT station_code, station_name, division, zone "
        "FROM stations ORDER BY station_code LIMIT $1 OFFSET $2",
        limit,
        offset,
    )
    stations = [dict(row) for row in rows]
    count = await conn.fetchval("SELECT COUNT(*) FROM stations")
    return {"stations": stations, "count": count}


@router.get("/{station_code}")
async def get_station(
    station_code: str,
    conn: asyncpg.Connection = Depends(get_db_connection),
):
    """Get a specific station by code."""
    row = await conn.fetchrow(
        "SELECT station_code, station_name, division, zone "
        "FROM stations WHERE station_code = $1",
        station_code,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Station not found")
    return dict(row)
