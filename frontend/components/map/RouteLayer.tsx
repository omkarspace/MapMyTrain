"use client";

import { useEffect, useRef } from "react";
import { useMap } from "./MapContext";
import { API_BASE_URL } from "@/lib/constants";
import { TRACK_COLOR_GLOW } from "@/lib/constants";

interface RouteLayerProps {
  trainNumber: string | null;
  sourceStation?: string;
  destinationStation?: string;
}

const ANIMATION_SPEED = 0.005;
const LAYER_ID = "route-line";
const GLOW_LAYER_ID = "route-glow";
const SOURCE_ID = "route-source";

export default function RouteLayer({ trainNumber }: RouteLayerProps) {
  const { map } = useMap();
  const animRef = useRef<number>(0);
  const stepRef = useRef(0);

  useEffect(() => {
    if (!map) return;

    const cleanup = () => {
      cancelAnimationFrame(animRef.current);
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
      if (map.getLayer(GLOW_LAYER_ID)) map.removeLayer(GLOW_LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    };

    if (!trainNumber) {
      cleanup();
      return;
    }

    const loadRoute = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/routes/train/${trainNumber}`
        );
        if (!res.ok) return;

        const geojson = await res.json();

        cleanup();

        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: geojson,
        });

        map.addLayer({
          id: GLOW_LAYER_ID,
          type: "line",
          source: SOURCE_ID,
          paint: {
            "line-color": TRACK_COLOR_GLOW,
            "line-width": 8,
            "line-opacity": 0.3,
            "line-blur": 4,
          },
        });

        map.addLayer({
          id: LAYER_ID,
          type: "line",
          source: SOURCE_ID,
          paint: {
            "line-color": TRACK_COLOR_GLOW,
            "line-width": 3,
            "line-opacity": 0.9,
            "line-dasharray": [0, 2],
          },
        });

        const geometry = geojson.geometry;
        if (geometry && geometry.coordinates && geometry.coordinates.length > 1) {
          let lastTime = 0;
          const animateDash = (time: number) => {
            if (time - lastTime > 16) {
              stepRef.current = (stepRef.current + ANIMATION_SPEED) % 2;
              const dashArray = [stepRef.current, 2 - stepRef.current];
              map.setPaintProperty(LAYER_ID, "line-dasharray", dashArray);
              map.setPaintProperty(GLOW_LAYER_ID, "line-dasharray", dashArray);
              lastTime = time;
            }
            animRef.current = requestAnimationFrame(animateDash);
          };
          animRef.current = requestAnimationFrame(animateDash);
        }
      } catch {
        // Silently fail on network errors
      }
    };

    if (map.isStyleLoaded()) {
      loadRoute();
    } else {
      map.on("load", loadRoute);
    }

    return cleanup;
  }, [map, trainNumber]);

  return null;
}
