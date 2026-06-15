"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { TrainPosition } from "@/lib/types";

interface TrainMarkerProps {
  map: maplibregl.Map | null;
  position: TrainPosition;
  onClick?: () => void;
}

export default function TrainMarker({ map, position, onClick }: TrainMarkerProps) {
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    const el = document.createElement("div");
    el.className = "train-marker";
    el.style.width = "24px";
    el.style.height = "24px";
    el.style.cursor = "pointer";
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L4 20H20L12 2Z" fill="#22c55e" transform="rotate(${position.bearing} 12 12)"/>
    </svg>`;

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([position.longitude, position.latitude])
      .addTo(map);

    if (onClick) {
      el.addEventListener("click", onClick);
    }

    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [map, position.bearing, position.latitude, position.longitude, onClick]);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLngLat([position.longitude, position.latitude]);
    }
  }, [position.longitude, position.latitude]);

  return null;
}
