"use client";

import { useState, useEffect, useRef } from "react";
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

const calculateVelocity = (prev: VelocityData[]): number => {
  if (prev.length < 2) return 0;
  
  const recent = prev.slice(-2);
  const timeDiff = (recent[1].timestamp - recent[0].timestamp) / 1000;
  
  if (timeDiff <= 0) return 0;
  
  const delayDiff = Math.abs(recent[1].delay - recent[0].delay);
  const estimatedSpeed = Math.round(80 + (delayDiff * 2));
  
  return Math.min(Math.max(estimatedSpeed, 0), 200);
};

export function TrainAnalytics({ trainId, currentPosition }: TrainAnalyticsProps) {
  const [history, setHistory] = useState<VelocityData[]>([]);
  const prevTrainIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevTrainIdRef.current !== trainId) {
      prevTrainIdRef.current = trainId;
      setHistory([]);
    }
  }, [trainId]);

  useEffect(() => {
    if (!currentPosition) return;

    const timer = setTimeout(() => {
      const now = Date.now();
      setHistory((prev) => {
        const velocity = calculateVelocity(prev);
        const newEntry: VelocityData = {
          timestamp: now,
          velocity,
          delay: currentPosition.delay,
        };
        return [...prev.slice(-20), newEntry];
      });
    }, 0);

    return () => clearTimeout(timer);
  }, [currentPosition]);

  const currentVelocity = history[history.length - 1]?.velocity || 0;

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
    <div
      className="rounded-lg p-3 mb-4"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <h4 className="text-xs font-medium mb-2" style={{ color: "var(--color-text-tertiary)" }}>
        Live Analytics
      </h4>
      <div className="grid grid-cols-2 gap-2">
        <div
          className="rounded-lg p-2"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="flex items-center gap-1 mb-1">
            <Gauge className="w-3 h-3" style={{ color: "var(--color-accent)" }} />
            <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>Velocity</span>
          </div>
          <p className="text-sm font-mono" style={{ color: "var(--color-text-primary)" }}>
            {currentVelocity} km/h
          </p>
        </div>
        <div
          className="rounded-lg p-2"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <div className="flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3" style={{ color: "var(--color-warning)" }} />
            <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>Delay Trend</span>
          </div>
          <div className="flex items-center gap-1">
            <p className="text-sm font-mono" style={{ color: "var(--color-text-primary)" }}>
              {currentPosition?.delay || 0}m
            </p>
            {trend === "up" && <TrendingUp className="w-3 h-3" style={{ color: "var(--color-error)" }} />}
            {trend === "down" && <TrendingDown className="w-3 h-3" style={{ color: "var(--color-success)" }} />}
            {trend === "stable" && <Minus className="w-3 h-3" style={{ color: "var(--color-text-tertiary)" }} />}
          </div>
        </div>
      </div>

      {history.length > 1 && (
        <div
          className="mt-2 rounded-lg p-2"
          style={{ backgroundColor: "var(--color-surface)" }}
        >
          <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
            Delay History (last {history.length} updates)
          </span>
          <div className="flex items-end gap-0.5 h-8 mt-1">
            {history.slice(-10).map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t transition-all duration-300 ease-out"
                style={{
                  height: `${Math.min(100, (h.delay / 60) * 100)}%`,
                  minHeight: "2px",
                  backgroundColor: "var(--color-accent-subtle)",
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
