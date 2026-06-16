export const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
export const WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL || "ws://localhost:8000/api/v1/stream";
export const TILE_SERVER_URL = process.env.NEXT_PUBLIC_TILE_SERVER_URL || "http://localhost:8080";
export const USE_MOCK_TELEMETRY = process.env.NEXT_PUBLIC_USE_MOCK_TELEMETRY === "true";

export const MAP_CENTER: [number, number] = [78.9629, 22.5937];
export const MAP_ZOOM = 5;
export const MAP_PITCH = 45;
export const MAP_BEARING = -15;
export const MAP_MAX_PITCH = 70;

export const DARK_MAP_STYLE = "https://tiles.openfreemap.org/styles/dark";

export const STATION_COLOR = "#f59e0b";
export const STATION_COLOR_GLOW = "#fbbf24";
export const STATION_HEIGHT_MAJOR = 25;
export const STATION_HEIGHT_REGULAR = 15;
export const STATION_HEIGHT_MINZoom = 12;

export const BUILDING_MINZOOM = 14;
export const BUILDING_COLOR_BASE = "#1a1a2e";
export const BUILDING_COLOR_HIGHLIGHT = "#2d2d44";

export const TRACK_COLOR_GLOW = "#60a5fa";

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
