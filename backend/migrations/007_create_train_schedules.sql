-- backend/migrations/007_create_train_schedules.sql
CREATE TABLE train_schedules (
    id SERIAL PRIMARY KEY,
    train_number VARCHAR(10) REFERENCES trains(train_number),
    station_code VARCHAR(10),
    station_name VARCHAR(150),
    arrival TIME,
    departure TIME,
    day INTEGER DEFAULT 1,
    stop_sequence INTEGER
);
CREATE INDEX idx_train_schedules_train ON train_schedules(train_number);
CREATE INDEX idx_train_schedules_station ON train_schedules(station_code);
