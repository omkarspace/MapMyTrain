from fastapi import APIRouter, Depends, HTTPException
import asyncpg
from app.dependencies import get_db_connection

router = APIRouter(prefix="/schedules", tags=["schedules"])


@router.get("/train/{train_number}")
async def get_train_schedule(
    train_number: str,
    conn: asyncpg.Connection = Depends(get_db_connection),
):
    """Get ordered schedule stops for a train."""
    rows = await conn.fetch(
        """
        SELECT station_code, station_name, arrival, departure, day, stop_sequence
        FROM train_schedules
        WHERE train_number = $1
        ORDER BY stop_sequence
        """,
        train_number,
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Schedule not found")

    stops = []
    for row in rows:
        stops.append({
            "station_code": row["station_code"],
            "station_name": row["station_name"],
            "arrival": row["arrival"].strftime("%H:%M") if row["arrival"] else None,
            "departure": row["departure"].strftime("%H:%M") if row["departure"] else None,
            "day": row["day"],
            "stop_sequence": row["stop_sequence"],
        })

    return {"train_number": train_number, "stops": stops}
