export interface Train {
  train_number: string;
  train_name: string;
  source_station_code?: string;
  destination_station_code?: string;
  runs_on_days?: string;
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