"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { useMap } from "@/components/map/MapContext";
import { InterpolatedPosition } from "@/lib/interpolation";
import { getTrainColorByDelay } from "./TrainModel";

const TRAIL_LENGTH = 8;
const TRAIL_OPACITY = 0.3;

interface TrainMarkerProps {
  position: InterpolatedPosition;
  onClick?: () => void;
}

function buildMarkerSvg(bearing: number, delay: number): string {
  const color = getTrainColorByDelay(delay);
  return `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="14" cy="14" r="10" fill="${color}" opacity="0.2">
      <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.2;0.05;0.2" dur="2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="14" cy="14" r="6" fill="${color}" opacity="0.9"/>
    <path d="M14 4 L20 14 L14 24 L8 14 Z" fill="${color}" transform="rotate(${bearing} 14 14)" opacity="0.9"/>
    <circle cx="14" cy="14" r="2" fill="white" opacity="0.8"/>
  </svg>`;
}

function getDelayClass(delay: number): string {
  if (delay <= 5) return "train-marker-delay-green";
  if (delay <= 15) return "train-marker-delay-yellow";
  return "train-marker-delay-red";
}

export default function TrainMarker({ position, onClick }: TrainMarkerProps) {
  const { map } = useMap();
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null);
  const onClickRef = useRef(onClick);
  const trailRef = useRef<maplibregl.Marker[]>([]);
  const trailHistoryRef = useRef<Array<{ lng: number; lat: number }>>([]);

  useEffect(() => {
    onClickRef.current = onClick;
  });

  const addTrailPoint = useCallback(
    (lng: number, lat: number) => {
      if (!map) return;

      const history = trailHistoryRef.current;
      const last = history[history.length - 1];
      if (last && last.lng === lng && last.lat === lat) return;

      history.push({ lng, lat });
      if (history.length > TRAIL_LENGTH) {
        history.shift();
      }

      while (trailRef.current.length > history.length) {
        const old = trailRef.current.pop();
        old?.remove();
      }

      const display = map.getZoom() >= 13 ? "none" : "block";

      history.forEach((point, i) => {
        const opacity = (i / history.length) * TRAIL_OPACITY;
        const size = 4 + (i / history.length) * 6;

        if (trailRef.current[i]) {
          trailRef.current[i].setLngLat([point.lng, point.lat]);
          const el = trailRef.current[i].getElement();
          el.style.width = `${size}px`;
          el.style.height = `${size}px`;
          el.style.opacity = String(opacity);
          el.style.display = display;
        } else {
          const el = document.createElement("div");
          el.style.width = `${size}px`;
          el.style.height = `${size}px`;
          el.style.borderRadius = "50%";
          el.style.backgroundColor = getTrainColorByDelay(position.delay);
          el.style.opacity = String(opacity);
          el.style.display = display;
          el.style.transition = "all 0.3s ease";

          const marker = new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat([point.lng, point.lat])
            .addTo(map);
          trailRef.current.push(marker);
        }
      });
    },
    [map, position.delay]
  );

  // 1. Create the marker once when map is loaded
  useEffect(() => {
    if (!map) return;

    const el = document.createElement("div");
    el.className = `train-marker-3d ${getDelayClass(position.delay)}`;
    el.style.width = "28px";
    el.style.height = "28px";
    el.style.cursor = "pointer";
    el.style.display = map.getZoom() >= 13 ? "none" : "block";
    el.innerHTML = buildMarkerSvg(position.bearing, position.delay);

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([position.longitude, position.latitude])
      .addTo(map);

    el.addEventListener("click", () => onClickRef.current?.());

    markerRef.current = marker;
    elRef.current = el;

    addTrailPoint(position.longitude, position.latitude);

    return () => {
      marker.remove();
      markerRef.current = null;
      elRef.current = null;
      trailRef.current.forEach((m) => m.remove());
      trailRef.current = [];
      trailHistoryRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]); // Run only when map instance is initialized or changed

  // 2. Update position, bearing, and delay dynamically without recreating the marker
  useEffect(() => {
    if (!markerRef.current || !elRef.current) return;

    markerRef.current.setLngLat([position.longitude, position.latitude]);
    elRef.current.className = `train-marker-3d ${getDelayClass(position.delay)}`;
    elRef.current.innerHTML = buildMarkerSvg(position.bearing, position.delay);
  }, [position.longitude, position.latitude, position.bearing, position.delay]);

  // 3. Listen to map zoom events to toggle visibility
  useEffect(() => {
    if (!map) return;

    const updateVisibility = () => {
      const display = map.getZoom() >= 13 ? "none" : "block";
      if (elRef.current) {
        elRef.current.style.display = display;
      }
      trailRef.current.forEach((m) => {
        const tel = m.getElement();
        if (tel) tel.style.display = display;
      });
    };

    map.on("zoom", updateVisibility);
    updateVisibility();

    return () => {
      map.off("zoom", updateVisibility);
    };
  }, [map]);

  // 4. Update the trail history
  useEffect(() => {
    addTrailPoint(position.longitude, position.latitude);
  }, [position.longitude, position.latitude, addTrailPoint]);

  return null;
}
