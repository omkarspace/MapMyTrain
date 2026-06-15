-- backend/migrations/005_create_indexes.sql
CREATE INDEX idx_stations_geom ON stations USING GIST (geom);
CREATE INDEX idx_tracks_geom ON tracks USING GIST (geom);
CREATE INDEX idx_telemetry_geom ON train_telemetry_logs USING GIST (current_location);
CREATE INDEX idx_trains_lookup ON trains (train_number, train_name);
CREATE INDEX idx_telemetry_time_series ON train_telemetry_logs (train_number, captured_at DESC);

-- Cleanup function for expired telemetry data
CREATE OR REPLACE FUNCTION clean_expired_telemetry()
RETURNS void AS $$
BEGIN
    DELETE FROM train_telemetry_logs 
    WHERE captured_at < NOW() - INTERVAL '48 hours';
END;
$$ LANGUAGE plpgsql;