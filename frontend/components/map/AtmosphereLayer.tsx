"use client";

import { useEffect, useRef } from "react";
import { useMap } from "./MapContext";
import { useTheme } from "@/providers/ThemeProvider";
import { getBlendedLightingConfig, getCurrentIST } from "@/lib/lighting";

const UPDATE_INTERVAL_MS = 30_000;

export default function AtmosphereLayer() {
  const { map } = useMap();
  const { theme } = useTheme();
  const lastConfigRef = useRef<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!map) return;

    const setFogOptions = (fog: Record<string, unknown>) => {
      try {
        (map as unknown as { setFog: (f: Record<string, unknown>) => void }).setFog(fog);
      } catch {
        // Fog API may not be available in all MapLibre versions
      }
    };

    const applyAtmosphere = () => {
      if (theme === "light") {
        setFogOptions({
          range: [0.5, 10],
          color: "#e0e7ff",
          "horizon-blend": 0.1,
          "high-color": "#bfdbfe",
          "space-color": "#dbeafe",
          "star-intensity": 0,
        });
        return;
      }

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

      setFogOptions({
        range: config.fogRange,
        color: config.fogColor,
        "horizon-blend": config.horizonBlend,
        "high-color": config.skyTopColor,
        "space-color": config.skyBottomColor,
        "star-intensity": config.starIntensity,
      });
    };

    const onLoad = () => {
      applyAtmosphere();
      intervalRef.current = setInterval(applyAtmosphere, UPDATE_INTERVAL_MS);
    };

    if (map.isStyleLoaded()) {
      onLoad();
    } else {
      map.on("load", onLoad);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [map, theme]);

  return null;
}
