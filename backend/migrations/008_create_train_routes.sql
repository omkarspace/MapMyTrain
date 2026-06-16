-- backend/migrations/008_create_train_routes.sql
CREATE TABLE train_routes (
    train_number VARCHAR(10) PRIMARY KEY REFERENCES trains(train_number),
    geom GEOMETRY(LineString, 4326),
    distance_km INTEGER,
    duration_h INTEGER,
    duration_m INTEGER
);
CREATE INDEX idx_train_routes_geom ON train_routes USING GIST(geom);
