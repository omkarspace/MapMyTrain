-- backend/migrations/004_create_telemetry_logs.sql
CREATE TABLE train_telemetry_logs (
    id BIGSERIAL PRIMARY KEY,
    train_number VARCHAR(10) REFERENCES trains(train_number) ON DELETE CASCADE,
    last_station_code VARCHAR(10) REFERENCES stations(station_code) ON DELETE SET NULL,
    next_station_code VARCHAR(10) REFERENCES stations(station_code) ON DELETE SET NULL,
    delay_minutes INT DEFAULT 0,
    bearing INT CHECK (bearing BETWEEN 0 AND 359),
    current_location GEOMETRY(Point, 4326),
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);