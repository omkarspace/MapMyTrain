"use client";

import { useEffect } from "react";
import { useMap } from "./MapContext";
import { BUILDING_MINZOOM, BUILDING_COLOR_BASE, BUILDING_COLOR_HIGHLIGHT } from "@/lib/constants";

export default function BuildingLayer() {
  const { map } = useMap();

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
              BUILDING_COLOR_BASE,
              30,
              BUILDING_COLOR_HIGHLIGHT,
              80,
              "#3d3d5c",
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
              0.7,
              18,
              0.85,
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
            "fill-extrusion-color": "#6366f1",
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
              0.15,
              18,
              0.25,
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
  }, [map]);

  return null;
}
