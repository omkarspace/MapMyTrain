"use client";

import { useEffect, useRef } from "react";
import { useMap } from "./MapContext";
import { getLightingConfig, getCurrentIST } from "@/lib/lighting";

const UPDATE_INTERVAL_MS = 60_000;

export default function AtmosphereLayer() {
  const { map } = useMap();
  const lastPhaseRef = useRef<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!map) return;

    const updateAtmosphere = () => {
      const { phase } = getCurrentIST();
      if (phase === lastPhaseRef.current) return;
      lastPhaseRef.current = phase;

      const config = getLightingConfig(phase);

      try {
        (map as unknown as { setFog: (fog: Record<string, unknown>) => void }).setFog({
          range: [1, 12],
          color: config.fogColor,
          "horizon-blend": 0.08,
          "high-color": config.skyTopColor,
          "space-color": config.skyBottomColor,
          "star-intensity": config.starIntensity,
        });
      } catch {
        // Fog API may not be available in all MapLibre versions
      }

      if (map.getLayer("sky")) {
        map.setPaintProperty("sky", "sky-opacity", phase === "night" ? 1.0 : 0.8);
      }
    };

    const addLayers = () => {
      if (map.getLayer("sky")) return;

      const { phase } = getCurrentIST();
      lastPhaseRef.current = phase;
      const config = getLightingConfig(phase);

      map.addLayer({
        id: "sky",
        type: "sky" as never,
        paint: {
          "sky-type": "gradient",
          "sky-gradient": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            ["literal", [0, 0, 0, 1]],
            5,
            ["literal", [10, 10, 30, 1]],
            10,
            ["literal", [15, 15, 40, 1]],
          ],
          "sky-gradient-center": [0.5, 0.5],
          "sky-gradient-radius": 0.9,
          "sky-opacity": phase === "night" ? 1.0 : 0.8,
        },
      } as never);

      try {
        (map as unknown as { setFog: (fog: Record<string, unknown>) => void }).setFog({
          range: [1, 12],
          color: config.fogColor,
          "horizon-blend": 0.08,
          "high-color": config.skyTopColor,
          "space-color": config.skyBottomColor,
          "star-intensity": config.starIntensity,
        });
      } catch {
        // Fog API may not be available in all MapLibre versions
      }

      intervalRef.current = setInterval(updateAtmosphere, UPDATE_INTERVAL_MS);
    };

    if (map.isStyleLoaded()) {
      addLayers();
    } else {
      map.on("load", addLayers);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [map]);

  return null;
}
