"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useMap } from "@/components/map/MapContext";

interface TerrainLayerProps {
  enabled?: boolean;
}

export default function TerrainLayer({ enabled = true }: TerrainLayerProps) {
  const { map } = useMap();
  const isLoadedRef = useRef(false);
  const [, forceRender] = useState(0);

  const setupTerrain = useCallback(() => {
    if (!map) return;

    if (enabled) {
      try {
        if (!map.getSource("terrain-dem")) {
          map.addSource("terrain-dem", {
            type: "raster-dem",
            url: "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
            tileSize: 256,
            maxzoom: 14,
          });
        }

        map.setTerrain({ source: "terrain-dem", exaggeration: 2.5 });
      } catch {
        // Terrain not available
      }
    } else {
      try {
        map.setTerrain(null);
        if (map.getSource("terrain-dem")) {
          map.removeSource("terrain-dem");
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  }, [map, enabled]);

  useEffect(() => {
    if (!map) return;

    if (map.isStyleLoaded()) {
      if (!isLoadedRef.current) {
        isLoadedRef.current = true;
        forceRender((n) => n + 1);
      }
      return;
    }

    const handleLoad = () => {
      isLoadedRef.current = true;
      forceRender((n) => n + 1);
    };

    map.on("load", handleLoad);
    return () => {
      map.off("load", handleLoad);
    };
  }, [map]);

  useEffect(() => {
    if (!isLoadedRef.current) return;
    setupTerrain();

    return () => {
      if (!map) return;
      try {
        map.setTerrain(null);
        if (map.getSource("terrain-dem")) {
          map.removeSource("terrain-dem");
        }
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [map, setupTerrain]);

  return null;
}
