"use client";

import { useEffect, useState } from "react";
import { useMap } from "@/components/map/MapContext";

interface TerrainLayerProps {
  enabled?: boolean;
}

export default function TerrainLayer({ enabled = false }: TerrainLayerProps) {
  const { map } = useMap();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!map) return;

    const handleLoad = () => {
      setIsLoaded(true);
    };

    map.on("load", handleLoad);
    return () => {
      map.off("load", handleLoad);
    };
  }, [map]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    if (enabled) {
      try {
        // Add terrain source (MapTiler or similar DEM provider)
        map.addSource("terrain", {
          type: "raster-dem",
          url: "https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=YOUR_MAPTILER_KEY",
          tileSize: 256,
        });

        // Set terrain exaggeration
        map.setTerrain({ source: "terrain", exaggeration: 1.5 });
      } catch (e) {
        console.warn("Terrain layer not available:", e);
      }
    } else {
      try {
        // Remove terrain
        map.setTerrain(null);
        if (map.getSource("terrain")) {
          map.removeSource("terrain");
        }
      } catch (e) {
        console.warn("Error removing terrain:", e);
      }
    }

    return () => {
      try {
        map.setTerrain(null);
        if (map.getSource("terrain")) {
          map.removeSource("terrain");
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, [map, isLoaded, enabled]);

  return null;
}
