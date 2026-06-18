"use client";

import { useEffect, useRef, useState } from "react";
import { X, Clock, MapPin, AlertTriangle, Train } from "lucide-react";
import { Train as TrainType, ScheduleStop } from "@/lib/types";
import { InterpolatedPosition } from "@/lib/interpolation";
import { API_BASE_URL, getTrainTypeColor } from "@/lib/constants";

interface TrainDrawerProps {
  train: TrainType | null;
  position: InterpolatedPosition | null;
  onClose: () => void;
}

export function TrainDrawer({ train, position, onClose }: TrainDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [schedule, setSchedule] = useState<ScheduleStop[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

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
    if (!train) return;
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

  const statusColor =
    position && position.delay > 0
      ? "text-amber-400"
      : "text-emerald-400";

  const statusText =
    position && position.delay > 0
      ? `${position.delay} min delayed`
      : "On time";

  const typeColor = getTrainTypeColor(train.train_type);

  return (
    <div
      ref={drawerRef}
      className="absolute bottom-0 left-0 right-0 z-20 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 rounded-t-2xl shadow-2xl max-h-[70vh] overflow-hidden flex flex-col animate-slide-up-enter"
    >
      <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mt-3" />
      <div className="p-4 overflow-y-auto flex-1">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Train className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">
                {train.train_name}
              </h3>
              <div className="flex items-center gap-2">
                <p className="text-sm text-slate-400 font-mono">
                  {train.train_number}
                </p>
                {train.train_type && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: typeColor + "22", color: typeColor }}
                  >
                    {train.train_type}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className={`flex items-center gap-1 text-sm font-medium ${statusColor}`}>
            {position && position.delay > 0 ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
            {statusText}
          </span>
          {train.distance_km && (
            <span className="text-xs text-slate-500 ml-2">
              {train.distance_km} km
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-1">Source</p>
            <p className="text-sm font-medium text-slate-100 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" />
              {train.source_station_code}
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-1">Destination</p>
            <p className="text-sm font-medium text-slate-100 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-rose-400" />
              {train.destination_station_code}
            </p>
          </div>
        </div>

        {position && (
          <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
            <p className="text-xs text-slate-400 mb-1">Current Position</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-400">Lat: </span>
                <span className="text-slate-100 font-mono">
                  {position.latitude.toFixed(4)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Lng: </span>
                <span className="text-slate-100 font-mono">
                  {position.longitude.toFixed(4)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Bearing: </span>
                <span className="text-slate-100 font-mono">
                  {position.bearing}°
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <h4 className="text-sm font-medium text-slate-300 mb-2">Timetable</h4>
          <div className="bg-slate-800/30 rounded-lg overflow-hidden">
            <div className="grid grid-cols-4 gap-2 px-3 py-2 bg-slate-800/50 text-xs text-slate-400 font-medium">
              <span>Station</span>
              <span>Arr</span>
              <span>Dep</span>
              <span>Day</span>
            </div>
            {scheduleLoading ? (
              <div className="px-3 py-4 text-xs text-slate-500 text-center flex items-center justify-center gap-2">
                <div className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                Loading schedule...
              </div>
            ) : schedule.length > 0 ? (
              schedule.map((stop) => (
                <div
                  key={`${stop.station_code}-${stop.stop_sequence}`}
                  className="grid grid-cols-4 gap-2 px-3 py-2 text-xs border-t border-slate-700/50"
                >
                  <div>
                    <span className="text-slate-100">{stop.station_code}</span>
                    <span className="text-slate-500 ml-1 hidden sm:inline">
                      {stop.station_name}
                    </span>
                  </div>
                  <span className="text-slate-300">{stop.arrival || "--"}</span>
                  <span className="text-slate-300">{stop.departure || "--"}</span>
                  <span className="text-slate-400">D{stop.day}</span>
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-xs text-slate-500 text-center">
                No schedule data
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500">
            © OpenStreetMap contributors • ODbL License
          </p>
        </div>
      </div>
    </div>
  );
}
