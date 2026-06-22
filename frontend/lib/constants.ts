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
export const LIGHT_MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

export const STATION_COLOR = "#f59e0b";
export const STATION_COLOR_GLOW = "#fbbf24";
export const STATION_HEIGHT_MAJOR = 25;
export const STATION_HEIGHT_REGULAR = 15;
export const STATION_HEIGHT_MINZoom = 12;

export const ZOOM_TIER_COUNTRY_MAX = 6;
export const ZOOM_TIER_REGIONAL_MAX = 10;
export const ZOOM_TIER_CITY_MAX = 13;

export const BUILDING_MINZOOM = 14;
export const BUILDING_COLOR_BASE = "#1a1a2e";
export const BUILDING_COLOR_HIGHLIGHT = "#2d2d44";

export const TRACK_COLOR_GLOW = "#60a5fa";

export const TRAIN_TYPE_COLORS: Record<string, string> = {
  "Rajdhani": "#ef4444",
  "Shatabdi": "#f59e0b",
  "Duronto": "#8b5cf6",
  "Vande Bharat": "#06b6d4",
  "Garib Rath": "#10b981",
  "Sampark Kranti": "#3b82f6",
  "Superfast": "#f97316",
  "Express": "#6b7280",
  "Passenger": "#6b7280",
  "Mail": "#6b7280",
  "DEMU": "#84cc16",
  "MEMU": "#22c55e",
  "Freight": "#78716c",
  "Special": "#ec4899",
};

export function getTrainTypeColor(trainType: string | undefined): string {
  if (!trainType) return "#6b7280";
  for (const [key, color] of Object.entries(TRAIN_TYPE_COLORS)) {
    if (trainType.toLowerCase().includes(key.toLowerCase())) {
      return color;
    }
  }
  return "#6b7280";
}
