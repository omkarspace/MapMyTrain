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
        if (!map.getSource("terrain-dem")) {
          map.addSource("terrain-dem", {
            type: "raster-dem",
            url: "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
            tileSize: 256,
            maxzoom: 14,
          });
        }

        map.setTerrain({ source: "terrain-dem", exaggeration: 1.3 });

        if (!map.getLayer("sky-terrain")) {
          map.addLayer(
            {
              id: "sky-terrain",
              type: "sky" as never,
              paint: {
                "sky-type": "atmosphere",
                "sky-atmosphere-sun": [0.0, 90.0],
                "sky-atmosphere-sun-intensity": 5,
              } as never,
            } as never
          );
        }
      } catch {
        // Terrain not available
      }
    } else {
      try {
        map.setTerrain(null);
        if (map.getLayer("sky-terrain")) {
          map.removeLayer("sky-terrain");
        }
        if (map.getSource("terrain-dem")) {
          map.removeSource("terrain-dem");
        }
      } catch {
        // Ignore cleanup errors
      }
    }

    return () => {
      try {
        map.setTerrain(null);
        if (map.getLayer("sky-terrain")) {
          map.removeLayer("sky-terrain");
        }
        if (map.getSource("terrain-dem")) {
          map.removeSource("terrain-dem");
        }
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [map, isLoaded, enabled]);

  return null;
}
