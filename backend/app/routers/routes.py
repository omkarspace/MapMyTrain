from fastapi import APIRouter, Depends, HTTPException
import asyncpg
from app.dependencies import get_db_connection

router = APIRouter(prefix="/routes", tags=["routes"])


@router.get("/train/{train_number}")
async def get_train_route(
    train_number: str,
    conn: asyncpg.Connection = Depends(get_db_connection),
):
    """Get GeoJSON route for a train. Prefers pre-stored geometry from train_routes."""
    route_row = await conn.fetchrow(
        "SELECT ST_AsGeoJSON(geom)::jsonb as geometry, distance_km, duration_h, duration_m "
        "FROM train_routes WHERE train_number = $1",
        train_number,
    )
    if route_row and route_row["geometry"]:
        return {
            "type": "Feature",
            "geometry": route_row["geometry"],
            "properties": {
                "train_number": train_number,
                "distance_km": route_row["distance_km"],
                "duration_h": route_row["duration_h"],
                "duration_m": route_row["duration_m"],
            },
        }

    train = await conn.fetchrow(
        "SELECT source_station_code, destination_station_code "
        "FROM trains WHERE train_number = $1",
        train_number,
    )
    if not train:
        raise HTTPException(status_code=404, detail="Train not found")

    source = train["source_station_code"]
    dest = train["destination_station_code"]

    source_geom = await conn.fetchval(
        "SELECT ST_AsGeoJSON(geom)::jsonb FROM stations WHERE station_code = $1",
        source,
    )
    dest_geom = await conn.fetchval(
        "SELECT ST_AsGeoJSON(geom)::jsonb FROM stations WHERE station_code = $1",
        dest,
    )

    if not source_geom or not dest_geom:
        raise HTTPException(status_code=404, detail="Station coordinates not found")

    source_coords = source_geom["coordinates"]
    dest_coords = dest_geom["coordinates"]

    route = await conn.fetchval(
        """
        SELECT ST_AsGeoJSON(
            ST_SnapToGrid(
                (SELECT ST_Collect(geom) FROM tracks
                 WHERE geom && ST_MakeEnvelope(
                    LEAST($1, $3) - 0.5, LEAST($2, $4) - 0.5,
                    GREATEST($1, $3) + 0.5, GREATEST($2, $4) + 0.5,
                    4326)
                ),
                0.0001
            )
        )::jsonb
        """,
        source_coords[0],
        source_coords[1],
        dest_coords[0],
        dest_coords[1],
    )

    if not route:
        return {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [source_coords, dest_coords],
            },
            "properties": {
                "train_number": train_number,
                "source": source,
                "destination": dest,
            },
        }

    return {
        "type": "Feature",
        "geometry": route,
        "properties": {
            "train_number": train_number,
            "source": source,
            "destination": dest,
        },
    }


@router.get("/segment")
async def get_track_segment(
    west: float,
    south: float,
    east: float,
    north: float,
    conn: asyncpg.Connection = Depends(get_db_connection),
):
    """Get track geometries within a bounding box for route display."""
    rows = await conn.fetch(
        """
        SELECT osm_id, gauge, electrified, tracks_count,
               ST_AsGeoJSON(geom)::jsonb as geometry
        FROM tracks
        WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
        LIMIT 500
        """,
        west,
        south,
        east,
        north,
    )

    features = []
    for row in rows:
        features.append({
            "type": "Feature",
            "geometry": row["geometry"],
            "properties": {
                "osm_id": row["osm_id"],
                "gauge": row["gauge"],
                "electrified": row["electrified"],
                "tracks_count": row["tracks_count"],
            },
        })

    return {
        "type": "FeatureCollection",
        "features": features,
    }
