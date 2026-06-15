#!/usr/bin/env python3
"""Seed script for spatial assets - stations and tracks."""
import asyncio
import logging
import asyncpg
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SeedScript")

MOCK_STATIONS = [
    ("NDLS", "New Delhi", "Northern Railway", "NR", 77.2090, 28.6139),
    ("CSMT", "Mumbai CST", "Central Railway", "CR", 72.8354, 18.9398),
    ("HWH", "Howrah", "Eastern Railway", "ER", 88.3630, 22.5803),
    ("MAS", "Chennai Central", "Southern Railway", "SR", 80.2707, 13.0827),
    ("SBC", "Bangalore City", "South Western Railway", "SWR", 77.5715, 12.9784),
    ("CNB", "Kanpur Central", "North Central Railway", "NCR", 80.3484, 26.4493),
    ("LKO", "Lucknow NR", "Northern Railway", "NR", 80.9462, 26.8467),
    ("GKP", "Gorakhpur", "North Eastern Railway", "NER", 83.3732, 26.7606),
    ("JP", "Jaipur", "North Western Railway", "NWR", 75.7873, 26.9228),
    ("ADI", "Ahmedabad", "Western Railway", "WR", 72.6315, 23.0225),
]


async def seed_stations(conn: asyncpg.Connection):
    """Seed station data."""
    logger.info("Seeding stations...")
    for code, name, division, zone, lng, lat in MOCK_STATIONS:
        await conn.execute(
            """
            INSERT INTO stations (station_code, station_name, division, zone, geom)
            VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326))
            ON CONFLICT (station_code) DO NOTHING
            """,
            code, name, division, zone, lng, lat,
        )
    logger.info(f"Seeded {len(MOCK_STATIONS)} stations.")


async def seed_trains(conn: asyncpg.Connection):
    """Seed train data."""
    logger.info("Seeding trains...")
    trains = [
        ("12301", "Rajdhani Express", "NDLS", "HWH", "1111100"),
        ("12951", "Mumbai Rajdhani", "NDLS", "BCT", "1111100"),
        ("12625", "Kerala Express", "NDLS", "TVC", "1111110"),
        ("12002", "Shatabdi Express", "NDLS", "BPL", "1111100"),
        ("12259", "Sealdah Rajdhani", "NDLS", "SDAH", "1111100"),
    ]
    for num, name, src, dst, days in trains:
        await conn.execute(
            """
            INSERT INTO trains (train_number, train_name, source_station_code, destination_station_code, runs_on_days)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (train_number) DO NOTHING
            """,
            num, name, src, dst, days,
        )
    logger.info(f"Seeded {len(trains)} trains.")


async def main():
    """Run seed script."""
    conn = await asyncpg.connect(settings.DATABASE_URL)
    try:
        await seed_stations(conn)
        await seed_trains(conn)
        logger.info("Seed complete.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
