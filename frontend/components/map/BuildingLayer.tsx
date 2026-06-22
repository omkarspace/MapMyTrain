"use client";

import { useEffect } from "react";
import { useMap } from "./MapContext";
import { useTheme } from "@/providers/ThemeProvider";
import { BUILDING_MINZOOM } from "@/lib/constants";

const DARK_BUILDING_BASE = "#1a1a2e";
const DARK_BUILDING_HIGHLIGHT = "#2d2d44";
const DARK_BUILDING_PEAK = "#3d3d5c";
const DARK_BUILDING_GLOW = "#6366f1";

const LIGHT_BUILDING_BASE = "#d1d5db";
const LIGHT_BUILDING_HIGHLIGHT = "#9ca3af";
const LIGHT_BUILDING_PEAK = "#6b7280";
const LIGHT_BUILDING_GLOW = "#818cf8";

export default function BuildingLayer() {
  const { map } = useMap();
  const { theme } = useTheme();

  useEffect(() => {
    if (!map) return;

    const addLayers = () => {
      if (map.getLayer("buildings-extrusion")) return;

      const sources = map.getStyle().sources;
      const hasBuildings = Object.keys(sources).some(
        (key) => key.includes("openmaptiles") || key.includes("building") || (sources[key] as Record<string, unknown>).type === "vector"
      );

      if (!hasBuildings) return;

      const vectorSourceKey = Object.keys(sources).find(
        (key) => (sources[key] as Record<string, unknown>).type === "vector"
      );

      if (!vectorSourceKey) return;

      const sourceUrl = typeof (sources[vectorSourceKey] as Record<string, unknown>).url === "string"
        ? (sources[vectorSourceKey] as Record<string, unknown>).url as string
        : null;

      if (!sourceUrl) return;

      const isLight = theme === "light";
      const buildingBase = isLight ? LIGHT_BUILDING_BASE : DARK_BUILDING_BASE;
      const buildingHighlight = isLight ? LIGHT_BUILDING_HIGHLIGHT : DARK_BUILDING_HIGHLIGHT;
      const buildingPeak = isLight ? LIGHT_BUILDING_PEAK : DARK_BUILDING_PEAK;
      const buildingGlow = isLight ? LIGHT_BUILDING_GLOW : DARK_BUILDING_GLOW;

      map.addSource("buildings-src", {
        type: "vector",
        url: sourceUrl,
      });

      map.addLayer(
        {
          id: "buildings-extrusion",
          type: "fill-extrusion",
          source: "buildings-src",
          "source-layer": "building",
          minzoom: BUILDING_MINZOOM,
          paint: {
            "fill-extrusion-color": [
              "interpolate",
              ["linear"],
              ["get", "render_height"],
              0,
              buildingBase,
              30,
              buildingHighlight,
              80,
              buildingPeak,
            ],
            "fill-extrusion-height": [
              "interpolate",
              ["linear"],
              ["zoom"],
              BUILDING_MINZOOM,
              0,
              BUILDING_MINZOOM + 2,
              ["get", "render_height"],
            ],
            "fill-extrusion-base": ["get", "render_min_height"],
            "fill-extrusion-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              BUILDING_MINZOOM,
              0,
              BUILDING_MINZOOM + 1,
              isLight ? 0.6 : 0.7,
              18,
              isLight ? 0.75 : 0.85,
            ],
          },
        },
        "water"
      );

      map.addLayer(
        {
          id: "buildings-glow-edges",
          type: "fill-extrusion",
          source: "buildings-src",
          "source-layer": "building",
          minzoom: BUILDING_MINZOOM,
          paint: {
            "fill-extrusion-color": buildingGlow,
            "fill-extrusion-height": [
              "interpolate",
              ["linear"],
              ["zoom"],
              BUILDING_MINZOOM,
              0,
              BUILDING_MINZOOM + 2,
              ["get", "render_height"],
            ],
            "fill-extrusion-base": [
              "-",
              ["get", "render_height"],
              1,
            ],
            "fill-extrusion-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              BUILDING_MINZOOM,
              0,
              BUILDING_MINZOOM + 1,
              isLight ? 0.1 : 0.15,
              18,
              isLight ? 0.2 : 0.25,
            ],
          },
        },
        "buildings-extrusion"
      );
    };

    if (map.isStyleLoaded()) {
      addLayers();
    } else {
      map.on("load", addLayers);
    }

    const handleStyleData = () => {
      if (map.isStyleLoaded() && !map.getLayer("buildings-extrusion")) {
        addLayers();
      }
    };
    map.on("styledata", handleStyleData);

    return () => {
      map.off("styledata", handleStyleData);
    };
  }, [map, theme]);

  return null;
}
