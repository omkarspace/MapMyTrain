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
        "SELECT station_code, station_name, division, zone, "
        "ST_X(geom) as longitude, ST_Y(geom) as latitude, "
        "COUNT(*) OVER() AS total_count "
        "FROM stations ORDER BY station_code LIMIT $1 OFFSET $2",
        limit,
        offset,
    )
    count = rows[0]["total_count"] if rows else 0
    stations = [{k: v for k, v in dict(row).items() if k != "total_count"} for row in rows]
    return {"stations": stations, "count": count}


@router.get("/bbox")
async def get_stations_in_bbox(
    west: float,
    south: float,
    east: float,
    north: float,
    limit: int = Query(default=200, le=500),
    conn: asyncpg.Connection = Depends(get_db_connection),
):
    """Get stations within bounding box using PostGIS spatial query."""
    rows = await conn.fetch(
        "SELECT station_code, station_name, division, zone, "
        "ST_X(geom) as longitude, ST_Y(geom) as latitude, "
        "CASE "
        "  WHEN station_code IN ('NDLS', 'MAS', 'HWH', 'BCT') THEN 'terminal' "
        "  WHEN station_code IN ('SBC', 'SC', 'NR', 'ER') THEN 'junction' "
        "  ELSE 'regular' "
        "END as station_type "
        "FROM stations "
        "WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326) "
        "LIMIT $5",
        west,
        south,
        east,
        north,
        limit,
    )
    return {"stations": [dict(row) for row in rows]}


@router.get("/{station_code}")
async def get_station(
    station_code: str,
    conn: asyncpg.Connection = Depends(get_db_connection),
):
    """Get a specific station by code."""
    row = await conn.fetchrow(
        "SELECT station_code, station_name, division, zone, "
        "ST_X(geom) as longitude, ST_Y(geom) as latitude "
        "FROM stations WHERE station_code = $1",
        station_code,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Station not found")
    return dict(row)
