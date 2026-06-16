"use client";

import { useEffect, useRef, useMemo } from "react";
import maplibregl from "maplibre-gl";
import { useMap } from "./MapContext";
import { useViewportStations, ViewportStation } from "@/hooks/useViewportStations";
import { getCurrentIST } from "@/lib/lighting";
import {
  STATION_COLOR,
  STATION_COLOR_GLOW,
  STATION_HEIGHT_MAJOR,
  STATION_HEIGHT_REGULAR,
  STATION_HEIGHT_MINZoom,
} from "@/lib/constants";

const NIGHT_STATION_GLOW = "#fbbf24";
const NIGHT_LABEL_COLOR = "#fde68a";
const NIGHT_LABEL_HALO = "rgba(15, 23, 42, 0.9)";
const NIGHT_UPDATE_MS = 60_000;

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
  const viewportStations = useViewportStations();
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const layerAddedRef = useRef(false);
  const lastPhaseRef = useRef<string>("");
  const nightIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const geojson = useMemo(() => stationsToGeoJSON(viewportStations), [viewportStations]);

  useEffect(() => {
    if (!map) return;

    const addOrUpdateSources = () => {
      if (!layerAddedRef.current) {
        map.addSource("stations-footprints", {
          type: "geojson",
          data: geojson.footprints,
        });

        map.addSource("stations-points", {
          type: "geojson",
          data: geojson.points,
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
              6, 4,
              12, 12,
              18, 20,
            ],
            "circle-color": STATION_COLOR_GLOW,
            "circle-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              6, 0,
              8, 0.3,
              14, 0.6,
            ],
            "circle-blur": 0.8,
          },
        });

        map.addLayer({
          id: "stations-extrusion",
          type: "fill-extrusion",
          source: "stations-footprints",
          minzoom: STATION_HEIGHT_MINZoom,
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
              STATION_HEIGHT_MINZoom, 0,
              STATION_HEIGHT_MINZoom + 1, 0.85,
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
              6, 8,
              10, 11,
              14, 14,
            ],
            "text-offset": [0, 1.5],
            "text-anchor": "top",
          },
          paint: {
            "text-color": "#fbbf24",
            "text-halo-color": "rgba(15, 23, 42, 0.8)",
            "text-halo-width": 1.5,
            "text-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              6, 0,
              8, 1,
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
                <div style="margin-top:4px; color:#64748b; font-size:10px;">
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

        const updateNightGlow = () => {
          const { phase } = getCurrentIST();
          if (phase === lastPhaseRef.current) return;
          lastPhaseRef.current = phase;

          const isNight = phase === "night" || phase === "dusk";

          if (map.getLayer("stations-glow")) {
            map.setPaintProperty(
              "stations-glow",
              "circle-color",
              isNight ? NIGHT_STATION_GLOW : STATION_COLOR_GLOW
            );
            map.setPaintProperty(
              "stations-glow",
              "circle-blur",
              isNight ? 1.2 : 0.8
            );
          }

          if (map.getLayer("stations-labels")) {
            map.setPaintProperty(
              "stations-labels",
              "text-color",
              isNight ? NIGHT_LABEL_COLOR : "#fbbf24"
            );
            map.setPaintProperty(
              "stations-labels",
              "text-halo-color",
              isNight ? NIGHT_LABEL_HALO : "rgba(15, 23, 42, 0.8)"
            );
            map.setPaintProperty(
              "stations-labels",
              "text-halo-width",
              isNight ? 2.5 : 1.5
            );
          }
        };

        lastPhaseRef.current = getCurrentIST().phase;
        nightIntervalRef.current = setInterval(updateNightGlow, NIGHT_UPDATE_MS);

        layerAddedRef.current = true;
      } else {
        const footprintsSource = map.getSource("stations-footprints") as maplibregl.GeoJSONSource;
        const pointsSource = map.getSource("stations-points") as maplibregl.GeoJSONSource;
        if (footprintsSource) footprintsSource.setData(geojson.footprints);
        if (pointsSource) pointsSource.setData(geojson.points);
      }
    };

    if (map.isStyleLoaded()) {
      addOrUpdateSources();
    } else {
      map.on("load", addOrUpdateSources);
    }

    return () => {
      popupRef.current?.remove();
      if (nightIntervalRef.current) {
        clearInterval(nightIntervalRef.current);
      }
      if (map.getLayer("stations-labels")) map.removeLayer("stations-labels");
      if (map.getLayer("stations-extrusion")) map.removeLayer("stations-extrusion");
      if (map.getLayer("stations-glow")) map.removeLayer("stations-glow");
      if (map.getSource("stations-points")) map.removeSource("stations-points");
      if (map.getSource("stations-footprints")) map.removeSource("stations-footprints");
      layerAddedRef.current = false;
    };
  }, [map, geojson]);

  return null;
}
