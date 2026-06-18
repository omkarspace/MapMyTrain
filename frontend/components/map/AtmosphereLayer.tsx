"use client";

import { useEffect, useRef } from "react";
import { useMap } from "./MapContext";
import { getBlendedLightingConfig, getCurrentIST } from "@/lib/lighting";

const UPDATE_INTERVAL_MS = 30_000;

export default function AtmosphereLayer() {
  const { map } = useMap();
  const lastConfigRef = useRef<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!map) return;

    const applyAtmosphere = () => {
      const time = getCurrentIST();
      const config = getBlendedLightingConfig(time);

      const configKey = [
        config.fogColor,
        config.fogDensity.toFixed(2),
        config.starIntensity.toFixed(2),
        config.skyTopColor,
        config.skyBottomColor,
        config.horizonBlend.toFixed(3),
        config.fogRange[1].toFixed(1),
      ].join("|");

      if (configKey === lastConfigRef.current) return;
      lastConfigRef.current = configKey;

      try {
        (
          map as unknown as {
            setFog: (fog: Record<string, unknown>) => void;
          }
        ).setFog({
          range: config.fogRange,
          color: config.fogColor,
          "horizon-blend": config.horizonBlend,
          "high-color": config.skyTopColor,
          "space-color": config.skyBottomColor,
          "star-intensity": config.starIntensity,
        });
      } catch {
        // Fog API may not be available in all MapLibre versions
      }

      if (map.getLayer("sky")) {
        const nightFactor = time.phase === "night" || time.phase === "dusk"
          ? 1.0
          : time.phase === "dawn"
            ? 0.9
            : 0.75;
        map.setPaintProperty("sky", "sky-opacity", nightFactor);
      }
    };

    const addLayers = () => {
      if (map.getLayer("sky")) return;

      const time = getCurrentIST();
      const config = getBlendedLightingConfig(time);

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
            4,
            ["literal", [5, 5, 20, 1]],
            8,
            ["literal", [10, 10, 35, 1]],
            12,
            ["literal", [15, 15, 40, 1]],
          ],
          "sky-gradient-center": [0.5, 0.5],
          "sky-gradient-radius": 0.9,
          "sky-opacity":
            time.phase === "night" || time.phase === "dusk" ? 1.0 : 0.8,
        },
      } as never);

      try {
        (
          map as unknown as {
            setFog: (fog: Record<string, unknown>) => void;
          }
        ).setFog({
          range: config.fogRange,
          color: config.fogColor,
          "horizon-blend": config.horizonBlend,
          "high-color": config.skyTopColor,
          "space-color": config.skyBottomColor,
          "star-intensity": config.starIntensity,
        });
      } catch {
        // Fog API may not be available in all MapLibre versions
      }

      applyAtmosphere();
      intervalRef.current = setInterval(applyAtmosphere, UPDATE_INTERVAL_MS);
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
