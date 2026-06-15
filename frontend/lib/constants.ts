export const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
export const WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL || "ws://localhost:8000/api/v1/stream";
export const TILE_SERVER_URL = process.env.NEXT_PUBLIC_TILE_SERVER_URL || "http://localhost:8080";
export const USE_MOCK_TELEMETRY = process.env.NEXT_PUBLIC_USE_MOCK_TELEMETRY === "true";

export const MAP_CENTER: [number, number] = [78.9629, 22.5937]; // India center
export const MAP_ZOOM = 5;

export const DARK_MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";