"use client";

import { useEffect } from "react";
import { TILE_SERVER_URL } from "@/lib/constants";

interface TrackLayerProps {
  map: maplibregl.Map | null;
}

export default function TrackLayer({ map }: TrackLayerProps) {
  useEffect(() => {
    if (!map) return;

    const addLayer = () => {
      if (map.getSource("tracks")) return;

      map.addSource("tracks", {
        type: "vector",
        tiles: [`${TILE_SERVER_URL}/data/tracks/{z}/{x}/{y}.pbf`],
        minzoom: 0,
        maxzoom: 14,
      });

      map.addLayer({
        id: "tracks-line",
        type: "line",
        source: "tracks",
        "source-layer": "tracks",
        paint: {
          "line-color": "#3b82f6",
          "line-width": 2,
          "line-opacity": 0.8,
        },
      });
    };

    if (map.isStyleLoaded()) {
      addLayer();
    } else {
      map.on("load", addLayer);
    }
  }, [map]);

  return null;
}
