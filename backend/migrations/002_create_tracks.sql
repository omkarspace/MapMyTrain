-- backend/migrations/002_create_tracks.sql
CREATE TABLE tracks (
    id SERIAL PRIMARY KEY,
    osm_id BIGINT UNIQUE,
    gauge VARCHAR(20) DEFAULT 'broad' CHECK (gauge IN ('broad', 'meter', 'narrow')),
    electrified BOOLEAN DEFAULT TRUE,
    tracks_count INT DEFAULT 2,
    geom GEOMETRY(LineString, 4326) NOT NULL
);