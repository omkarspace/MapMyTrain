"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw, Loader2 } from "lucide-react";

interface OfflineIndicatorProps {
  isWebSocketConnected?: boolean;
  onRetry?: () => void;
}

export function OfflineIndicator({ isWebSocketConnected = true, onRetry }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastSync(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const timer = setTimeout(() => {
      setIsOnline(navigator.onLine);
      setLastSync(new Date());
    }, 0);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const getStatus = () => {
    if (!isOnline) return "offline";
    if (!isWebSocketConnected) return "connecting";
    return "connected";
  };

  const status = getStatus();

  if (status === "connected") {
    return (
      <div className="absolute top-4 right-4 z-20 animate-fade-in">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors duration-300"
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-success) 15%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-success) 25%, transparent)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Wifi className="w-3 h-3" style={{ color: "var(--color-success)" }} />
          <span className="text-[10px] font-medium" style={{ color: "var(--color-success)" }}>Live</span>
        </div>
      </div>
    );
  }

  if (status === "connecting") {
    return (
      <div className="absolute top-4 right-4 z-20 animate-fade-in">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors duration-300"
          style={{
            backgroundColor: "color-mix(in srgb, var(--color-warning) 15%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-warning) 25%, transparent)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Loader2 className="w-3 h-3 animate-spin" style={{ color: "var(--color-warning)" }} />
          <span className="text-[10px] font-medium" style={{ color: "var(--color-warning)" }}>Connecting...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-20 animate-fade-in">
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors duration-300"
        style={{
          backgroundColor: "color-mix(in srgb, var(--color-error) 15%, transparent)",
          border: "1px solid color-mix(in srgb, var(--color-error) 25%, transparent)",
          backdropFilter: "blur(8px)",
        }}
      >
        <WifiOff className="w-3 h-3" style={{ color: "var(--color-error)" }} />
        <span className="text-[10px] font-medium" style={{ color: "var(--color-error)" }}>Offline</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-1 p-0.5 rounded transition-colors"
            style={{ color: "var(--color-error)" }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "color-mix(in srgb, var(--color-error) 20%, transparent)"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
            aria-label="Reconnect"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>
      {lastSync && (
        <p className="text-[8px] mt-1 text-right" style={{ color: "var(--color-text-tertiary)" }}>
          Last sync: {lastSync.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
