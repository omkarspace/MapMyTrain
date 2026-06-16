-- backend/migrations/003_create_trains.sql
CREATE TABLE trains (
    train_number VARCHAR(10) PRIMARY KEY,
    train_name VARCHAR(150) NOT NULL,
    source_station_code VARCHAR(10) REFERENCES stations(station_code),
    destination_station_code VARCHAR(10) REFERENCES stations(station_code),
    runs_on_days VARCHAR(7) NOT NULL,
    train_type VARCHAR(30),
    zone VARCHAR(10),
    return_train VARCHAR(10),
    distance_km INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);