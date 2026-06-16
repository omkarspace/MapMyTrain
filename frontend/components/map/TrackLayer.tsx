"use client";

import { useEffect } from "react";
import { useMap } from "./MapContext";

export default function TrackLayer() {
  const { map } = useMap();

  useEffect(() => {
    if (!map) return;

    const addLayers = () => {
      if (map.getLayer("tracks-ballast")) return;

      const sources = map.getStyle().sources;
      // Find the vector source used by the map style (usually "openmaptiles")
      const vectorSourceKey = Object.keys(sources).find(
        (key) =>
          key.includes("openmaptiles") ||
          (sources[key] as Record<string, unknown>).type === "vector"
      );

      if (!vectorSourceKey) return;

      // Hide default low-contrast railway layers from style to avoid overlap
      const defaultRailwayLayers = [
        "railway",
        "railway_dashline",
        "railway_minor",
        "railway_minor_dashline",
        "railway_transit",
        "railway_transit_dashline",
      ];
      defaultRailwayLayers.forEach((layerId) => {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, "visibility", "none");
        }
      });

      // Find the first symbol layer so we can insert tracks below text labels
      const layers = map.getStyle().layers;
      const firstSymbolLayer = layers.find((l) => l.type === "symbol")?.id;

      // 1. Ballast (Gravel bed)
      map.addLayer(
        {
          id: "tracks-ballast",
          type: "line",
          source: vectorSourceKey,
          "source-layer": "transportation",
          filter: ["==", ["get", "class"], "rail"],
          paint: {
            "line-color": "#1e293b",
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              1,
              8,
              3,
              12,
              8,
              16,
              12,
            ],
            "line-opacity": 0.6,
            "line-blur": 1.5,
          },
        },
        firstSymbolLayer
      );

      // 2. Rails (Steel tracks)
      map.addLayer(
        {
          id: "tracks-rails",
          type: "line",
          source: vectorSourceKey,
          "source-layer": "transportation",
          filter: ["==", ["get", "class"], "rail"],
          paint: {
            "line-color": "#94a3b8",
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              0.5,
              8,
              1.2,
              12,
              2,
              16,
              3,
            ],
            "line-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              0.4,
              8,
              0.7,
              12,
              0.9,
            ],
          },
        },
        firstSymbolLayer
      );

      // 3. Sleepers (Wooden/concrete ties)
      map.addLayer(
        {
          id: "tracks-sleepers",
          type: "line",
          source: vectorSourceKey,
          "source-layer": "transportation",
          filter: ["==", ["get", "class"], "rail"],
          paint: {
            "line-color": "#475569",
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10,
              0,
              12,
              0.8,
              16,
              1.5,
            ],
            "line-dasharray": [0.5, 3],
            "line-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              10,
              0,
              12,
              0.5,
              16,
              0.7,
            ],
          },
        },
        firstSymbolLayer
      );

      // 4. Electrification (Overhead wires)
      map.addLayer(
        {
          id: "tracks-electrification",
          type: "line",
          source: vectorSourceKey,
          "source-layer": "transportation",
          filter: ["==", ["get", "class"], "rail"],
          minzoom: 12,
          paint: {
            "line-color": "#a78bfa",
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              12,
              0,
              14,
              0.5,
              16,
              1,
            ],
            "line-dasharray": [2, 4],
            "line-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              12,
              0,
              14,
              0.4,
              16,
              0.6,
            ],
          },
        },
        firstSymbolLayer
      );

      // 5. Track Glow (Aesthetic lighting near active routes)
      map.addLayer(
        {
          id: "tracks-glow",
          type: "line",
          source: vectorSourceKey,
          "source-layer": "transportation",
          filter: ["==", ["get", "class"], "rail"],
          paint: {
            "line-color": "#60a5fa",
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              0,
              6,
              0,
              10,
              2,
              14,
              4,
            ],
            "line-opacity": 0.15,
            "line-blur": 3,
          },
        },
        firstSymbolLayer
      );
    };

    if (map.isStyleLoaded()) {
      addLayers();
    } else {
      map.on("load", addLayers);
    }

    const handleStyleData = () => {
      if (map.isStyleLoaded() && !map.getLayer("tracks-ballast")) {
        addLayers();
      }
    };
    map.on("styledata", handleStyleData);

    return () => {
      map.off("styledata", handleStyleData);

      // Restore default style layers visibility
      const defaultRailwayLayers = [
        "railway",
        "railway_dashline",
        "railway_minor",
        "railway_minor_dashline",
        "railway_transit",
        "railway_transit_dashline",
      ];
      defaultRailwayLayers.forEach((layerId) => {
        if (map.getLayer(layerId)) {
          try {
            map.setLayoutProperty(layerId, "visibility", "visible");
          } catch {
            // style might be torn down
          }
        }
      });

      if (map.getLayer("tracks-electrification")) map.removeLayer("tracks-electrification");
      if (map.getLayer("tracks-glow")) map.removeLayer("tracks-glow");
      if (map.getLayer("tracks-sleepers")) map.removeLayer("tracks-sleepers");
      if (map.getLayer("tracks-rails")) map.removeLayer("tracks-rails");
      if (map.getLayer("tracks-ballast")) map.removeLayer("tracks-ballast");
    };
  }, [map]);

  return null;
}
