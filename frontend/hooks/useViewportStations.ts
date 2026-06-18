"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { useMap } from "@/components/map/MapContext";
import { API_BASE_URL, ZOOM_TIER_COUNTRY_MAX } from "@/lib/constants";

export interface ViewportStation {
  station_code: string;
  station_name: string;
  division?: string;
  zone?: string;
  longitude: number;
  latitude: number;
  station_type: "junction" | "terminal" | "regular";
}

const DEBOUNCE_MS = 300;
const CACHE_MAX_SIZE = 20;

interface CacheEntry {
  key: string;
  stations: ViewportStation[];
  timestamp: number;
}

const bboxCache: CacheEntry[] = [];

function getCacheKey(bounds: maplibregl.LngLatBounds): string {
  return `${bounds.getWest().toFixed(2)},${bounds.getSouth().toFixed(2)},${bounds.getEast().toFixed(2)},${bounds.getNorth().toFixed(2)}`;
}

function findCachedEntry(key: string): ViewportStation[] | null {
  const entry = bboxCache.find((e) => e.key === key);
  if (entry) {
    entry.timestamp = Date.now();
    return entry.stations;
  }
  return null;
}

function addToCache(key: string, stations: ViewportStation[]): void {
  if (bboxCache.length >= CACHE_MAX_SIZE) {
    bboxCache.sort((a, b) => a.timestamp - b.timestamp);
    bboxCache.shift();
  }
  bboxCache.push({ key, stations, timestamp: Date.now() });
}

export function useViewportStations(): ViewportStation[] {
  const { map } = useMap();
  const [stations, setStations] = useState<ViewportStation[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastBoundsRef = useRef<string>("");
  const lastZoomRef = useRef<number>(0);

  useEffect(() => {
    if (!map) return;

    const fetchStations = async (bounds: maplibregl.LngLatBounds, zoom: number) => {
      if (zoom <= ZOOM_TIER_COUNTRY_MAX) {
        setStations([]);
        return;
      }

      const key = getCacheKey(bounds);
      if (key === lastBoundsRef.current) return;
      lastBoundsRef.current = key;

      const cached = findCachedEntry(key);
      if (cached) {
        setStations(cached);
        return;
      }

      const limit = zoom <= 10 ? 150 : 300;

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/stations/bbox?west=${bounds.getWest()}&south=${bounds.getSouth()}&east=${bounds.getEast()}&north=${bounds.getNorth()}&limit=${limit}`
        );
        if (res.ok) {
          const data = await res.json();
          const stationData = data.stations || [];
          addToCache(key, stationData);
          setStations(stationData);
        }
      } catch {
        // Silently fail on network errors
      }
    };

    const debouncedFetch = (bounds: maplibregl.LngLatBounds, zoom: number) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => fetchStations(bounds, zoom), DEBOUNCE_MS);
    };

    const handleMoveEnd = () => {
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      const zoomChanged = Math.abs(zoom - lastZoomRef.current) > 1;
      lastZoomRef.current = zoom;

      if (zoomChanged) {
        lastBoundsRef.current = "";
      }

      debouncedFetch(bounds, zoom);
    };

    map.on("moveend", handleMoveEnd);
    map.on("zoomend", handleMoveEnd);

    if (map.isStyleLoaded()) {
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      lastZoomRef.current = zoom;
      fetchStations(bounds, zoom);
    } else {
      map.on("load", () => {
        const bounds = map.getBounds();
        const zoom = map.getZoom();
        lastZoomRef.current = zoom;
        fetchStations(bounds, zoom);
      });
    }

    return () => {
      map.off("moveend", handleMoveEnd);
      map.off("zoomend", handleMoveEnd);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [map]);

  return stations;
}
