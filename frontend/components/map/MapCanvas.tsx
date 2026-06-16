"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  MAP_CENTER,
  MAP_ZOOM,
  MAP_PITCH,
  MAP_BEARING,
  MAP_MAX_PITCH,
  DARK_MAP_STYLE,
} from "@/lib/constants";
import { useMap } from "./MapContext";

export default function MapCanvas() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const { setMap } = useMap();
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: DARK_MAP_STYLE,
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      pitch: MAP_PITCH,
      bearing: MAP_BEARING,
      maxPitch: MAP_MAX_PITCH,
    } as maplibregl.MapOptions & Record<string, unknown>);

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;
    setMap(map);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      setMap(null);
    };
  }, [setMap]);

  return (
    <div
      ref={mapContainer}
      className="absolute inset-0 w-full h-full"
      style={{ touchAction: "none" }}
    />
  );
}
