export interface Train {
  train_number: string;
  train_name: string;
  source_station_code?: string;
  destination_station_code?: string;
  runs_on_days?: string;
  average_delay?: number;
  train_type?: string;
  zone?: string;
  return_train?: string;
  distance_km?: number;
}

export interface Station {
  station_code: string;
  station_name: string;
  division?: string;
  zone?: string;
  longitude?: number;
  latitude?: number;
}

export interface TrainPosition {
  train_id: number;
  longitude: number;
  latitude: number;
  bearing: number;
  delay: number;
}

export interface TrainListResponse {
  trains: Train[];
  count: number;
}

export interface ScheduleStop {
  station_code: string;
  station_name: string;
  arrival: string | null;
  departure: string | null;
  day: number;
  stop_sequence: number;
}

export interface ScheduleResponse {
  train_number: string;
  stops: ScheduleStop[];
}
