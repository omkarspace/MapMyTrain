"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { useMap } from "@/components/map/MapContext";
import { API_BASE_URL } from "@/lib/constants";

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

export function useViewportStations(): ViewportStation[] {
  const { map } = useMap();
  const [stations, setStations] = useState<ViewportStation[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastBoundsRef = useRef<string>("");

  useEffect(() => {
    if (!map) return;

    const fetchStations = async (bounds: maplibregl.LngLatBounds) => {
      const key = `${bounds.getWest().toFixed(3)},${bounds.getSouth().toFixed(3)},${bounds.getEast().toFixed(3)},${bounds.getNorth().toFixed(3)}`;
      if (key === lastBoundsRef.current) return;
      lastBoundsRef.current = key;

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/stations/bbox?west=${bounds.getWest()}&south=${bounds.getSouth()}&east=${bounds.getEast()}&north=${bounds.getNorth()}&limit=300`
        );
        if (res.ok) {
          const data = await res.json();
          setStations(data.stations);
        }
      } catch {
        // Silently fail on network errors
      }
    };

    const debouncedFetch = (bounds: maplibregl.LngLatBounds) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => fetchStations(bounds), DEBOUNCE_MS);
    };

    const handleMoveEnd = () => {
      const bounds = map.getBounds();
      debouncedFetch(bounds);
    };

    map.on("moveend", handleMoveEnd);
    map.on("zoomend", handleMoveEnd);

    if (map.isStyleLoaded()) {
      const bounds = map.getBounds();
      fetchStations(bounds);
    } else {
      map.on("load", () => {
        const bounds = map.getBounds();
        fetchStations(bounds);
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
