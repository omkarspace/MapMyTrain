"use client";

import { useEffect, useRef, useMemo } from "react";
import maplibregl from "maplibre-gl";
import { useMap } from "./MapContext";
import { useTheme } from "@/providers/ThemeProvider";
import { useViewportStations, ViewportStation } from "@/hooks/useViewportStations";
import { getCurrentIST } from "@/lib/lighting";
import { MAJOR_STATION_POINTS } from "@/lib/stationData";
import {
  STATION_COLOR,
  STATION_COLOR_GLOW,
  STATION_HEIGHT_MAJOR,
  STATION_HEIGHT_REGULAR,
  ZOOM_TIER_CITY_MAX,
} from "@/lib/constants";

const NIGHT_STATION_GLOW = "#fbbf24";
const NIGHT_LABEL_COLOR = "#fde68a";
const NIGHT_LABEL_HALO = "rgba(15, 23, 42, 0.9)";
const NIGHT_UPDATE_MS = 60_000;

const LIGHT_STATION_GLOW = "#d97706";
const LIGHT_LABEL_COLOR = "#92400e";
const LIGHT_LABEL_HALO = "rgba(255, 255, 255, 0.9)";

function stationsToGeoJSON(stations: ViewportStation[]) {
  const points: GeoJSON.Feature[] = [];
  const footprints: GeoJSON.Feature[] = [];

  for (const s of stations) {
    points.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [s.longitude, s.latitude] },
      properties: {
        station_code: s.station_code,
        station_name: s.station_name,
        type: s.station_type,
        platforms: s.station_type === "junction" ? 12 : s.station_type === "terminal" ? 8 : 4,
      },
    });

    const widthM = s.station_type === "junction" ? 200 : s.station_type === "terminal" ? 160 : 100;
    const heightM = s.station_type === "junction" ? 80 : s.station_type === "terminal" ? 60 : 40;

    const metersPerDegreeLng = 111320 * Math.cos((s.latitude * Math.PI) / 180);
    const metersPerDegreeLat = 110540;

    const halfLng = (widthM / 2) / metersPerDegreeLng;
    const halfLat = (heightM / 2) / metersPerDegreeLat;

    footprints.push({
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [s.longitude - halfLng, s.latitude - halfLat],
          [s.longitude + halfLng, s.latitude - halfLat],
          [s.longitude + halfLng, s.latitude + halfLat],
          [s.longitude - halfLng, s.latitude + halfLat],
          [s.longitude - halfLng, s.latitude - halfLat],
        ]],
      },
      properties: {
        station_code: s.station_code,
        station_name: s.station_name,
        type: s.station_type,
        platforms: s.station_type === "junction" ? 12 : s.station_type === "terminal" ? 8 : 4,
      },
    });
  }

  return {
    points: { type: "FeatureCollection" as const, features: points },
    footprints: { type: "FeatureCollection" as const, features: footprints },
  };
}

export default function StationLayer() {
  const { map } = useMap();
  const { theme } = useTheme();
  const viewportStations = useViewportStations();
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const layersAddedRef = useRef(false);
  const lastPhaseRef = useRef<string>("");
  const nightIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const zoomRef = useRef<number>(5);

  const majorStationsGeojson = useMemo(() => {
    return MAJOR_STATION_POINTS as GeoJSON.FeatureCollection;
  }, []);

  const viewportGeojson = useMemo(
    () => stationsToGeoJSON(viewportStations),
    [viewportStations]
  );

  useEffect(() => {
    if (!map) return;

    const addLayers = () => {
      if (layersAddedRef.current) return;

      const isLight = theme === "light";
      const labelColor = isLight ? LIGHT_LABEL_COLOR : "#fbbf24";
      const labelHalo = isLight ? LIGHT_LABEL_HALO : "rgba(15, 23, 42, 0.9)";
      const glowColor = isLight ? LIGHT_STATION_GLOW : STATION_COLOR_GLOW;

      map.addSource("major-stations", {
        type: "geojson",
        data: majorStationsGeojson,
      });

      map.addSource("stations-points", {
        type: "geojson",
        data: viewportGeojson.points,
      });

      map.addSource("stations-footprints", {
        type: "geojson",
        data: viewportGeojson.footprints,
      });

      map.addLayer({
        id: "major-stations-glow",
        type: "circle",
        source: "major-stations",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0, 3,
            4, 6,
            6, 10,
          ],
          "circle-color": glowColor,
          "circle-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0, 0.4,
            4, 0.6,
            6, 0.8,
          ],
          "circle-blur": isLight ? 0.4 : 0.6,
        },
      });

      map.addLayer({
        id: "major-stations-labels",
        type: "symbol",
        source: "major-stations",
        layout: {
          "text-field": ["get", "station_code"],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0, 9,
            4, 11,
            6, 13,
          ],
          "text-offset": [0, 1.2],
          "text-anchor": "top",
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": labelColor,
          "text-halo-color": labelHalo,
          "text-halo-width": isLight ? 2 : 1.5,
          "text-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0, 0.6,
            3, 0.8,
            6, 1,
          ],
        },
      });

      map.addLayer({
        id: "stations-glow",
        type: "circle",
        source: "stations-points",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            7, 3,
            10, 8,
            14, 14,
            18, 20,
          ],
          "circle-color": glowColor,
          "circle-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            7, 0,
            8, 0.4,
            12, 0.7,
            16, 0.5,
          ],
          "circle-blur": isLight ? 0.5 : 0.8,
        },
      });

      map.addLayer({
        id: "stations-extrusion",
        type: "fill-extrusion",
        source: "stations-footprints",
        minzoom: ZOOM_TIER_CITY_MAX,
        paint: {
          "fill-extrusion-color": [
            "match",
            ["get", "type"],
            "junction",
            STATION_COLOR,
            "terminal",
            "#fb923c",
            STATION_COLOR,
          ],
          "fill-extrusion-height": [
            "match",
            ["get", "type"],
            "junction",
            STATION_HEIGHT_MAJOR,
            STATION_HEIGHT_REGULAR,
          ],
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            ZOOM_TIER_CITY_MAX, 0,
            ZOOM_TIER_CITY_MAX + 0.5, 0.7,
            ZOOM_TIER_CITY_MAX + 1.5, 0.9,
          ],
        },
      });

      map.addLayer({
        id: "stations-labels",
        type: "symbol",
        source: "stations-points",
        layout: {
          "text-field": ["get", "station_code"],
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8, 8,
            10, 10,
            14, 13,
            18, 15,
          ],
          "text-offset": [0, 1.5],
          "text-anchor": "top",
        },
        paint: {
          "text-color": labelColor,
          "text-halo-color": labelHalo,
          "text-halo-width": isLight ? 2 : 1.5,
          "text-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            7, 0,
            8, 0.7,
            10, 1,
          ],
        },
      });

      map.on("click", "stations-extrusion", (e) => {
        if (!e.features?.length) return;
        const feature = e.features[0];
        const props = feature.properties as {
          station_code: string;
          station_name: string;
          type: string;
          platforms: number;
        };

        const coords = (feature.geometry as { type: string; coordinates: number[] }).coordinates;
        const lng = Array.isArray(coords[0]) ? coords[0][0] : coords[0];
        const lat = Array.isArray(coords[0]) ? coords[0][1] : coords[1];

        if (popupRef.current) {
          popupRef.current.remove();
        }

        const popup = new maplibregl.Popup({
          closeButton: false,
          maxWidth: "250px",
          offset: 15,
        })
          .setLngLat([lng, lat])
          .setHTML(
            `<div class="station-tooltip">
              <div class="station-code">${props.station_code}</div>
              <div class="station-name">${props.station_name}</div>
              <div style="margin-top:4px; color:${isLight ? "#64748b" : "#94a3b8"}; font-size:10px;">
                ${props.type.charAt(0).toUpperCase() + props.type.slice(1)} · ${props.platforms} platforms
              </div>
            </div>`
          )
          .addTo(map);

        popupRef.current = popup;
      });

      map.on("mouseenter", "stations-extrusion", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "stations-extrusion", () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("mouseenter", "major-stations-glow", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "major-stations-glow", () => {
        map.getCanvas().style.cursor = "";
      });

      const updateNightGlow = () => {
        if (theme === "light") return;

        const { phase } = getCurrentIST();
        if (phase === lastPhaseRef.current) return;
        lastPhaseRef.current = phase;

        const isNight = phase === "night" || phase === "dusk";

        const glowLayers = ["stations-glow", "major-stations-glow"];
        for (const layerId of glowLayers) {
          if (map.getLayer(layerId)) {
            map.setPaintProperty(
              layerId,
              "circle-color",
              isNight ? NIGHT_STATION_GLOW : STATION_COLOR_GLOW
            );
            map.setPaintProperty(
              layerId,
              "circle-blur",
              isNight ? 1.2 : 0.6
            );
          }
        }

        const labelLayers = ["stations-labels", "major-stations-labels"];
        for (const layerId of labelLayers) {
          if (map.getLayer(layerId)) {
            map.setPaintProperty(
              layerId,
              "text-color",
              isNight ? NIGHT_LABEL_COLOR : "#fbbf24"
            );
            map.setPaintProperty(
              layerId,
              "text-halo-color",
              isNight ? NIGHT_LABEL_HALO : "rgba(15, 23, 42, 0.8)"
            );
            map.setPaintProperty(
              layerId,
              "text-halo-width",
              isNight ? 2.5 : 1.5
            );
          }
        }
      };

      lastPhaseRef.current = getCurrentIST().phase;
      nightIntervalRef.current = setInterval(updateNightGlow, NIGHT_UPDATE_MS);

      layersAddedRef.current = true;
    };

    if (map.isStyleLoaded()) {
      addLayers();
    } else {
      map.on("load", addLayers);
    }

    return () => {
      popupRef.current?.remove();
      if (nightIntervalRef.current) {
        clearInterval(nightIntervalRef.current);
      }
      const allLayers = [
        "stations-labels",
        "stations-extrusion",
        "stations-glow",
        "major-stations-labels",
        "major-stations-glow",
      ];
      for (const layerId of allLayers) {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
      }
      const allSources = [
        "stations-points",
        "stations-footprints",
        "major-stations",
      ];
      for (const sourceId of allSources) {
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      }
      layersAddedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, majorStationsGeojson, theme]);

  useEffect(() => {
    if (!map || !layersAddedRef.current) return;

    const pointsSource = map.getSource("stations-points") as maplibregl.GeoJSONSource;
    const footprintsSource = map.getSource("stations-footprints") as maplibregl.GeoJSONSource;

    if (pointsSource) pointsSource.setData(viewportGeojson.points);
    if (footprintsSource) footprintsSource.setData(viewportGeojson.footprints);
  }, [map, viewportGeojson]);

  useEffect(() => {
    if (!map) return;

    const handleZoom = () => {
      zoomRef.current = map.getZoom();
    };

    map.on("zoom", handleZoom);
    return () => {
      map.off("zoom", handleZoom);
    };
  }, [map]);

  return null;
}
