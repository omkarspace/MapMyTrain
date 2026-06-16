#!/usr/bin/env python3
"""Seed script for real train data from data_train/ folder."""
import asyncio
import json
import logging
import sys
import os
from datetime import time
import asyncpg

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("SeedTrainData")

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data_train")
BATCH_SIZE = 500


def _parse_time(val):
    """Parse a time string like '07:55:00' or '07:55' into a datetime.time object."""
    if not val or val in ("None", "null", ""):
        return None
    try:
        parts = str(val).strip().split(":")
        h = int(parts[0])
        m = int(parts[1]) if len(parts) > 1 else 0
        s = int(parts[2]) if len(parts) > 2 else 0
        return time(h, m, s)
    except (ValueError, IndexError):
        return None


async def seed_stations(conn: asyncpg.Connection):
    """Load stations.json and upsert into stations table."""
    path = os.path.join(DATA_DIR, "stations.json")
    logger.info(f"Loading stations from {path}...")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    features = data.get("features", [])
    count = 0
    batch = []
    for feature in features:
        props = feature.get("properties", {})
        geom = feature.get("geometry") or {}
        coords = geom.get("coordinates", [None, None])
        code = props.get("code")
        name = props.get("name")
        state = props.get("state")
        zone = props.get("zone")
        address = props.get("address")
        lng = coords[0] if coords and len(coords) > 0 else None
        lat = coords[1] if coords and len(coords) > 1 else None
        if not code or not name or lng is None or lat is None:
            continue
        batch.append((code, name, state, zone, address, lng, lat))
        if len(batch) >= BATCH_SIZE:
            await _upsert_stations(conn, batch)
            count += len(batch)
            batch = []
    if batch:
        await _upsert_stations(conn, batch)
        count += len(batch)
    logger.info(f"Seeded {count} stations.")


async def _upsert_stations(conn: asyncpg.Connection, batch):
    await conn.executemany(
        """
        INSERT INTO stations (station_code, station_name, division, zone, geom)
        VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326))
        ON CONFLICT (station_code) DO UPDATE SET
            station_name = EXCLUDED.station_name,
            division = COALESCE(EXCLUDED.division, stations.division),
            zone = COALESCE(EXCLUDED.zone, stations.zone),
            geom = EXCLUDED.geom
        """,
        [(code, name, state, zone, lng, lat) for code, name, state, zone, _addr, lng, lat in batch],
    )


async def seed_trains(conn: asyncpg.Connection):
    """Load trains.json and insert into trains + train_routes tables."""
    path = os.path.join(DATA_DIR, "trains.json")
    logger.info(f"Loading trains from {path}...")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    features = data.get("features", [])

    # Collect all referenced station codes and insert stubs for missing ones
    station_codes = set()
    for feature in features:
        props = feature.get("properties", {})
        src = props.get("from_station_code")
        dst = props.get("to_station_code")
        if src:
            station_codes.add(src)
        if dst:
            station_codes.add(dst)

    existing = await conn.fetch("SELECT station_code FROM stations")
    existing_codes = {r["station_code"] for r in existing}
    missing = station_codes - existing_codes

    if missing:
        logger.info(f"Inserting {len(missing)} stub stations for train references...")
        stub_batch = [(code, code) for code in sorted(missing)]
        await conn.executemany(
            """
            INSERT INTO stations (station_code, station_name, geom)
            VALUES ($1, $2, ST_SetSRID(ST_MakePoint(0, 0), 4326))
            ON CONFLICT (station_code) DO NOTHING
            """,
            stub_batch,
        )

    train_batch = []
    route_batch = []
    count = 0

    for feature in features:
        props = feature.get("properties", {})
        geom = feature.get("geometry") or {}
        train_number = str(props.get("number", ""))
        if len(train_number) > 10:
            train_number = train_number.split("-")[0]
        train_name = props.get("name")
        if not train_number or not train_name:
            continue

        source_code = props.get("from_station_code")
        dest_code = props.get("to_station_code")
        departure = props.get("departure")
        arrival = props.get("arrival")
        duration_h = props.get("duration_h")
        duration_m = props.get("duration_m")
        distance = props.get("distance")
        train_type = props.get("type")
        zone = props.get("zone")
        return_train = props.get("return_train")
        if return_train and len(str(return_train)) > 10:
            return_train = str(return_train)[:10]
        classes = props.get("classes", [])

        runs_days = _compute_runs_days(props)

        train_batch.append((
            str(train_number), train_name, source_code, dest_code,
            runs_days, train_type, zone, return_train,
            int(distance) if distance else None,
        ))

        coords = geom.get("coordinates")
        if coords and geom.get("type") == "LineString":
            geojson_str = json.dumps(geom)
            route_batch.append((
                str(train_number), geojson_str,
                int(distance) if distance else None,
                int(duration_h) if duration_h else None,
                int(duration_m) if duration_m else None,
            ))

        if len(train_batch) >= BATCH_SIZE:
            await _insert_trains(conn, train_batch)
            await _insert_routes(conn, route_batch)
            count += len(train_batch)
            train_batch = []
            route_batch = []

    if train_batch:
        await _insert_trains(conn, train_batch)
        await _insert_routes(conn, route_batch)
        count += len(train_batch)

    logger.info(f"Seeded {count} trains with routes.")


def _compute_runs_days(props: dict) -> str:
    """Compute 7-char binary string for running days."""
    days = props.get("runs_on_days")
    if days and len(days) == 7:
        return days
    return "1111111"


async def _insert_trains(conn: asyncpg.Connection, batch):
    await conn.executemany(
        """
        INSERT INTO trains (train_number, train_name, source_station_code, destination_station_code,
                           runs_on_days, train_type, zone, return_train, distance_km)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (train_number) DO UPDATE SET
            train_name = EXCLUDED.train_name,
            source_station_code = EXCLUDED.source_station_code,
            destination_station_code = EXCLUDED.destination_station_code,
            train_type = EXCLUDED.train_type,
            zone = EXCLUDED.zone,
            return_train = EXCLUDED.return_train,
            distance_km = EXCLUDED.distance_km
        """,
        batch,
    )


async def _insert_routes(conn: asyncpg.Connection, batch):
    if not batch:
        return
    await conn.executemany(
        """
        INSERT INTO train_routes (train_number, geom, distance_km, duration_h, duration_m)
        VALUES ($1, ST_GeomFromGeoJSON($2)::geometry, $3, $4, $5)
        ON CONFLICT (train_number) DO UPDATE SET
            geom = EXCLUDED.geom,
            distance_km = EXCLUDED.distance_km,
            duration_h = EXCLUDED.duration_h,
            duration_m = EXCLUDED.duration_m
        """,
        batch,
    )


async def seed_schedules(conn: asyncpg.Connection):
    """Load schedules.json and bulk insert into train_schedules."""
    valid_rows = await conn.fetch("SELECT train_number FROM trains")
    valid_train_numbers = {r["train_number"] for r in valid_rows}

    # Drop FK constraint for faster bulk insert
    await conn.execute("ALTER TABLE train_schedules DROP CONSTRAINT IF EXISTS train_schedules_train_number_fkey")

    path = os.path.join(DATA_DIR, "schedules.json")
    logger.info(f"Loading schedules from {path}...")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    logger.info(f"Total schedule records: {len(data)}")
    batch = []
    count = 0
    train_stops = {}

    for entry in data:
        train_number = str(entry.get("train_number", ""))
        if len(train_number) > 10:
            train_number = train_number.split("-")[0]
        station_code = str(entry.get("station_code", ""))[:10]
        if not train_number or not station_code:
            continue

        if train_number not in train_stops:
            train_stops[train_number] = 0
        train_stops[train_number] += 1
        stop_seq = train_stops[train_number]

        arrival = _parse_time(entry.get("arrival"))
        departure = _parse_time(entry.get("departure"))
        day = entry.get("day", 1)

        batch.append((
            train_number, station_code, entry.get("station_name", ""),
            arrival, departure, int(day) if day else 1, stop_seq,
        ))

        if len(batch) >= BATCH_SIZE:
            await _insert_schedules(conn, batch, valid_train_numbers)
            count += len(batch)
            batch = []

    if batch:
        await _insert_schedules(conn, batch, valid_train_numbers)
        count += len(batch)

    logger.info(f"Seeded {count} schedule stops across {len(train_stops)} trains.")

    # Recreate FK constraint
    await conn.execute(
        "ALTER TABLE train_schedules ADD CONSTRAINT train_schedules_train_number_fkey "
        "FOREIGN KEY (train_number) REFERENCES trains(train_number)"
    )


async def _insert_schedules(conn: asyncpg.Connection, batch, valid_train_numbers: set):
    filtered = [row for row in batch if row[0] in valid_train_numbers]
    if not filtered:
        return
    await conn.executemany(
        """
        INSERT INTO train_schedules (train_number, station_code, station_name, arrival, departure, day, stop_sequence)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        """,
        filtered,
    )


async def main():
    """Run seed script."""
    from app.config import settings
    logger.info(f"Connecting to database...")
    conn = await asyncpg.connect(settings.DATABASE_URL)
    try:
        await seed_stations(conn)
        await seed_trains(conn)
        await seed_schedules(conn)
        logger.info("Seed complete.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
