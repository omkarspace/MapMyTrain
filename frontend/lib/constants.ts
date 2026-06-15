export const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
export const WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL || "ws://localhost:8000/api/v1/stream";
export const TILE_SERVER_URL = process.env.NEXT_PUBLIC_TILE_SERVER_URL || "http://localhost:8080";
export const USE_MOCK_TELEMETRY = process.env.NEXT_PUBLIC_USE_MOCK_TELEMETRY === "true";

export const MAP_CENTER: [number, number] = [78.9629, 22.5937]; // India center
export const MAP_ZOOM = 5;

export const DARK_MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export const MOCK_TRAINS = [
  {
    train_number: "12301",
    train_name: "Rajdhani Express",
    source_station_code: "NDLS",
    destination_station_code: "HWH",
    average_delay: 12,
  },
  {
    train_number: "12951",
    train_name: "Mumbai Rajdhani",
    source_station_code: "NDLS",
    destination_station_code: "BCT",
    average_delay: 8,
  },
  {
    train_number: "12259",
    train_name: "Sealdah Rajdhani",
    source_station_code: "NDLS",
    destination_station_code: "SDAH",
    average_delay: 0,
  },
];