"use client";

import { useEffect, useRef, useState } from "react";
import { X, Clock, MapPin, AlertTriangle, Train } from "lucide-react";
import { Train as TrainType, ScheduleStop } from "@/lib/types";
import { InterpolatedPosition } from "@/lib/interpolation";
import { API_BASE_URL, getTrainTypeColor } from "@/lib/constants";
import { ScheduleSkeleton } from "./Skeleton";

interface TrainDrawerProps {
  train: TrainType | null;
  position: InterpolatedPosition | null;
  onClose: () => void;
}

export function TrainDrawer({ train, position, onClose }: TrainDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [schedule, setSchedule] = useState<ScheduleStop[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const prevTrainRef = useRef<string | null>(null);

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.stopPropagation();
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.stopPropagation();
    };

    drawer.addEventListener("touchstart", handleTouchStart, { passive: false });
    drawer.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      drawer.removeEventListener("touchstart", handleTouchStart);
      drawer.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  useEffect(() => {
    if (train && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [train]);

  useEffect(() => {
    if (!train) return;

    const drawer = drawerRef.current;
    if (!drawer) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusableElements = drawer.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [train]);

  useEffect(() => {
    if (!train) return;
    
    if (prevTrainRef.current !== train.train_number) {
      setScheduleLoading(true);
      prevTrainRef.current = train.train_number;
    }
    
    let cancelled = false;
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/v1/schedules/train/${train.train_number}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) return { stops: [] };
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setSchedule(data.stops || []);
          setScheduleLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSchedule([]);
          setScheduleLoading(false);
        }
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [train]);

  if (!train) return null;

  const isDelayed = position && position.delay > 0;

  const typeColor = getTrainTypeColor(train.train_type);

  return (
    <div
      ref={drawerRef}
      role="dialog"
      aria-label="Train details"
      className="absolute bottom-0 left-0 right-0 z-20 flex flex-col overflow-hidden max-h-[70vh] animate-slide-up-enter"
      style={{
        backgroundColor: "var(--color-surface)",
        borderTop: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
        boxShadow: "var(--shadow-xl)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div
        className="mx-auto mt-2.5 mb-1 rounded-full"
        style={{
          width: "36px",
          height: "4px",
          backgroundColor: "var(--color-border)",
        }}
      />
      <div className="px-5 pt-2 pb-4 overflow-y-auto flex-1">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
              style={{
                backgroundColor: "var(--color-accent-subtle)",
                color: "var(--color-accent)",
              }}
            >
              <Train className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {train.train_name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs font-mono" style={{ color: "var(--color-text-tertiary)" }}>
                  {train.train_number}
                </p>
                {train.train_type && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: typeColor + "1a", color: typeColor }}
                  >
                    {train.train_type}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors duration-150 outline-none"
            style={{ color: "var(--color-text-tertiary)" }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--color-surface-alt)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            onFocus={(e) => e.currentTarget.style.boxShadow = "0 0 0 2px var(--color-accent-subtle)"}
            onBlur={(e) => e.currentTarget.style.boxShadow = "none"}
            aria-label="Close train details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span
            className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: isDelayed ? "var(--color-warning)" : "var(--color-success)" }}
          >
            {isDelayed ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : (
              <Clock className="w-3.5 h-3.5" />
            )}
            {isDelayed ? `${position.delay} min delayed` : "On time"}
          </span>
          {train.distance_km && (
            <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              {train.distance_km} km
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div
            className="rounded-lg p-3"
            style={{ backgroundColor: "var(--color-bg)" }}
          >
            <p className="text-xs mb-1" style={{ color: "var(--color-text-tertiary)" }}>Source</p>
            <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: "var(--color-text-primary)" }}>
              <MapPin className="w-3.5 h-3.5" style={{ color: "var(--color-success)" }} />
              {train.source_station_code}
            </p>
          </div>
          <div
            className="rounded-lg p-3"
            style={{ backgroundColor: "var(--color-bg)" }}
          >
            <p className="text-xs mb-1" style={{ color: "var(--color-text-tertiary)" }}>Destination</p>
            <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: "var(--color-text-primary)" }}>
              <MapPin className="w-3.5 h-3.5" style={{ color: "var(--color-error)" }} />
              {train.destination_station_code}
            </p>
          </div>
        </div>

        {position && (
          <div
            className="rounded-lg p-3 mb-4"
            style={{ backgroundColor: "var(--color-bg)" }}
          >
            <p className="text-xs mb-2" style={{ color: "var(--color-text-tertiary)" }}>Current Position</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div>
                <span style={{ color: "var(--color-text-tertiary)" }}>Lat: </span>
                <span className="font-mono text-xs" style={{ color: "var(--color-text-primary)" }}>
                  {position.latitude.toFixed(4)}
                </span>
              </div>
              <div>
                <span style={{ color: "var(--color-text-tertiary)" }}>Lng: </span>
                <span className="font-mono text-xs" style={{ color: "var(--color-text-primary)" }}>
                  {position.longitude.toFixed(4)}
                </span>
              </div>
              <div>
                <span style={{ color: "var(--color-text-tertiary)" }}>Bearing: </span>
                <span className="font-mono text-xs" style={{ color: "var(--color-text-primary)" }}>
                  {position.bearing}°
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <h4 className="text-xs font-medium mb-2" style={{ color: "var(--color-text-secondary)" }}>
            Timetable
          </h4>
          <div
            className="rounded-lg overflow-hidden"
            style={{ backgroundColor: "var(--color-bg)" }}
          >
            <div
              className="grid grid-cols-4 gap-2 px-3 py-2 text-xs font-medium"
              style={{
                color: "var(--color-text-tertiary)",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <span>Station</span>
              <span>Arr</span>
              <span>Dep</span>
              <span>Day</span>
            </div>
            {scheduleLoading ? (
                <ScheduleSkeleton />
              ) : schedule.length > 0 ? (
                schedule.map((stop) => (
                  <div
                    key={`${stop.station_code}-${stop.stop_sequence}`}
                    className="grid grid-cols-4 gap-2 px-3 py-2 text-xs"
                    style={{
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    <div>
                      <span>{stop.station_code}</span>
                      <span className="ml-1 hidden sm:inline" style={{ color: "var(--color-text-tertiary)" }}>
                        {stop.station_name}
                      </span>
                    </div>
                    <span style={{ color: "var(--color-text-secondary)" }}>{stop.arrival || "--"}</span>
                    <span style={{ color: "var(--color-text-secondary)" }}>{stop.departure || "--"}</span>
                    <span style={{ color: "var(--color-text-tertiary)" }}>D{stop.day}</span>
                  </div>
                ))
              ) : (
                <div className="px-3 py-4 text-xs text-center" style={{ color: "var(--color-text-tertiary)" }}>
                  No schedule data
                </div>
              )}
          </div>
        </div>

        <div
          className="rounded-lg p-3 text-center"
          style={{
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
          }}
        >
          <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            © OpenStreetMap contributors • ODbL License
          </p>
        </div>
      </div>
    </div>
  );
}
