"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

interface OfflineIndicatorProps {
  onRetry?: () => void;
}

export function OfflineIndicator({ onRetry }: OfflineIndicatorProps) {
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

    // Delay setting state to avoid synchronous updates in effect body
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

  if (isOnline) {
    return (
      <div className="absolute top-4 right-4 z-20 animate-fade-in">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30 rounded-full transition-colors duration-300">
          <Wifi className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
          <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-medium">Live</span>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 z-20 animate-fade-in">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 backdrop-blur-sm border border-amber-500/30 rounded-full transition-colors duration-300">
        <WifiOff className="w-3 h-3 text-amber-500 dark:text-amber-400" />
        <span className="text-[10px] text-amber-500 dark:text-amber-400 font-medium">Offline</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-1 p-0.5 hover:bg-amber-500/20 rounded transition-colors"
          >
            <RefreshCw className="w-3 h-3 text-amber-500 dark:text-amber-400" />
          </button>
        )}
      </div>
      {lastSync && (
        <p className="text-[8px] text-slate-400 dark:text-slate-500 mt-1 text-right">
          Last sync: {lastSync.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

export class OfflineCache {
  private dbName = "mapmytrain-offline";
  private storeName = "train-data";

  async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "trainId" });
        }
      };
    });
  }

  async cacheTrainData(trainId: number, data: unknown): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction(this.storeName, "readwrite");
    const store = tx.objectStore(this.storeName);
    store.put({ trainId, data, timestamp: Date.now() });
  }

  async getCachedTrainData(trainId: number): Promise<unknown | null> {
    const db = await this.openDB();
    const tx = db.transaction(this.storeName, "readonly");
    const store = tx.objectStore(this.storeName);
    return new Promise((resolve, reject) => {
      const request = store.get(trainId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result?.data || null);
    });
  }

  async clearExpiredCache(maxAgeMs: number = 3600000): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction(this.storeName, "readwrite");
    const store = tx.objectStore(this.storeName);
    const cutoff = Date.now() - maxAgeMs;

    return new Promise((resolve, reject) => {
      const request = store.openCursor();
      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          if (cursor.value.timestamp < cutoff) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }
}

export const offlineCache = new OfflineCache();
