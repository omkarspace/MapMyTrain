-- backend/migrations/001_create_stations.sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE stations (
    station_code VARCHAR(10) PRIMARY KEY,
    station_name VARCHAR(150) NOT NULL,
    division VARCHAR(50),
    zone VARCHAR(10),
    geom GEOMETRY(Point, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);