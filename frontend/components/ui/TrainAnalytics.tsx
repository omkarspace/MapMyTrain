"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, Clock, Gauge } from "lucide-react";
import { TrainPosition } from "@/lib/types";

interface TrainAnalyticsProps {
  trainId: number;
  currentPosition: TrainPosition | null;
}

interface VelocityData {
  timestamp: number;
  velocity: number;
  delay: number;
}

export function TrainAnalytics({ trainId, currentPosition }: TrainAnalyticsProps) {
  const [history, setHistory] = useState<VelocityData[]>([]);
  const [currentVelocity, setCurrentVelocity] = useState(0);

  useEffect(() => {
    if (!currentPosition) return;

    const now = Date.now();
    setHistory((prev) => {
      const newEntry: VelocityData = {
        timestamp: now,
        velocity: calculateVelocity(prev, currentPosition),
        delay: currentPosition.delay,
      };
      return [...prev.slice(-20), newEntry];
    });
  }, [currentPosition]);

  useEffect(() => {
    if (history.length < 2) return;

    const latest = history[history.length - 1];
    setCurrentVelocity(latest.velocity);
  }, [history]);

  const calculateVelocity = (prev: VelocityData[], current: TrainPosition): number => {
    if (prev.length === 0) return 0;

    const last = prev[prev.length - 1];
    const timeDiff = (Date.now() - last.timestamp) / 1000; // seconds

    if (timeDiff === 0) return 0;

    // Simplified velocity calculation (km/h estimate)
    // In production, use Haversine formula for accurate distance
    return Math.round(Math.random() * 60 + 80); // Mock: 80-140 km/h
  };

  const getTrend = (): "up" | "down" | "stable" => {
    if (history.length < 2) return "stable";
    const recent = history.slice(-3);
    const avgDelay = recent.reduce((sum, h) => sum + h.delay, 0) / recent.length;
    const prevAvg = history.slice(-6, -3).reduce((sum, h) => sum + h.delay, 0) / 3;

    if (avgDelay > prevAvg + 2) return "up";
    if (avgDelay < prevAvg - 2) return "down";
    return "stable";
  };

  const trend = getTrend();

  return (
    <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
      <h4 className="text-xs text-slate-400 mb-2 font-medium">Live Analytics</h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900/50 rounded-lg p-2">
          <div className="flex items-center gap-1 mb-1">
            <Gauge className="w-3 h-3 text-blue-400" />
            <span className="text-[10px] text-slate-400">Velocity</span>
          </div>
          <p className="text-sm font-mono text-slate-100">{currentVelocity} km/h</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-2">
          <div className="flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] text-slate-400">Delay Trend</span>
          </div>
          <div className="flex items-center gap-1">
            <p className="text-sm font-mono text-slate-100">
              {currentPosition?.delay || 0}m
            </p>
            {trend === "up" && <TrendingUp className="w-3 h-3 text-red-400" />}
            {trend === "down" && <TrendingDown className="w-3 h-3 text-green-400" />}
            {trend === "stable" && <Minus className="w-3 h-3 text-slate-400" />}
          </div>
        </div>
      </div>

      {history.length > 1 && (
        <div className="mt-2 bg-slate-900/50 rounded-lg p-2">
          <span className="text-[10px] text-slate-400">Delay History (last {history.length} updates)</span>
          <div className="flex items-end gap-0.5 h-8 mt-1">
            {history.slice(-10).map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-slate-700 rounded-t"
                style={{
                  height: `${Math.min(100, (h.delay / 60) * 100)}%`,
                  minHeight: "2px",
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
