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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

export default function MapCanvas() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const { setMap } = useMap();
  const mapRef = useRef<maplibregl.Map | null>(null);
  const isAnimatingRef = useRef(false);

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

    let animFrameId: number | null = null;
    let lastZoom = MAP_ZOOM;
    let targetPitch = MAP_PITCH;
    let targetBearing = MAP_BEARING;
    let currentPitch = MAP_PITCH;
    let currentBearing = MAP_BEARING;

    const getTargetPitch = (zoom: number): number => {
      if (zoom <= 6) return 30;
      if (zoom <= 10) return 40;
      if (zoom <= 13) return 55;
      return 60;
    };

    const getTargetBearing = (zoom: number): number => {
      if (zoom <= 8) return MAP_BEARING;
      const drift = Math.sin(zoom * 0.5) * 5;
      return MAP_BEARING + drift;
    };

    const animateCamera = () => {
      const currentZoom = map.getZoom();
      const zoomDelta = Math.abs(currentZoom - lastZoom);

      if (zoomDelta > 0.3) {
        targetPitch = getTargetPitch(currentZoom);
        targetBearing = getTargetBearing(currentZoom);
        lastZoom = currentZoom;

        if (!isAnimatingRef.current) {
          isAnimatingRef.current = true;
        }
      }

      if (isAnimatingRef.current) {
        const easeT = 0.08;
        const newPitch = lerp(currentPitch, targetPitch, easeT);
        const bearingDiff = targetBearing - currentBearing;
        const normalizedDiff = ((bearingDiff + 180) % 360) - 180;
        const newBearing = currentBearing + normalizedDiff * easeT;

        const pitchDiff = Math.abs(newPitch - currentPitch);
        const bearingDiffAbs = Math.abs(normalizedDiff * easeT);

        if (pitchDiff < 0.05 && bearingDiffAbs < 0.05) {
          currentPitch = targetPitch;
          currentBearing = targetBearing;
          isAnimatingRef.current = false;
        } else {
          currentPitch = newPitch;
          currentBearing = newBearing;
        }

        map.easeTo(
          {
            pitch: currentPitch,
            bearing: currentBearing,
            duration: 0,
            easing: (t) => t,
          },
          { immediateRender: false }
        );
      }

      animFrameId = requestAnimationFrame(animateCamera);
    };

    animFrameId = requestAnimationFrame(animateCamera);

    mapRef.current = map;
    setMap(map);

    return () => {
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
      }
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
