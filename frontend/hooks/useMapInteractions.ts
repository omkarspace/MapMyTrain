"use client";

import { useCallback } from "react";
import { useMap } from "@/components/map/MapContext";

interface MapInteractionOptions {
  onTrainClick?: (trainId: number) => void;
}

export function useMapInteractions({ onTrainClick }: MapInteractionOptions = {}) {
  const { map } = useMap();

  const flyTo = useCallback(
    (lng: number, lat: number, zoom: number = 12) => {
      if (!map) return;
      map.flyTo({ center: [lng, lat], zoom, essential: true });
    },
    [map]
  );

  const fitBounds = useCallback(
    (bounds: [[number, number], [number, number]]) => {
      if (!map) return;
      map.fitBounds(bounds, { padding: 50 });
    },
    [map]
  );

  const getViewport = useCallback(() => {
    if (!map) return null;
    const bounds = map.getBounds();
    return {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
      zoom: map.getZoom(),
      center: map.getCenter(),
    };
  }, [map]);

  const handleTrainClick = useCallback(
    (trainId: number) => {
      onTrainClick?.(trainId);
    },
    [onTrainClick]
  );

  return { flyTo, fitBounds, getViewport, handleTrainClick };
}
