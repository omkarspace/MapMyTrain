"use client";

import { useEffect, useRef, useState } from "react";
import { WS_URL, USE_MOCK_TELEMETRY } from "@/lib/constants";
import {
  updateTrainTarget,
  getAllInterpolatedPositions,
  InterpolatedPosition,
} from "@/lib/interpolation";

const TRAIN_POSITION_SIZE = 16;

const WORKER_CODE = `
const TRAIN_POSITION_SIZE = 16;
let ws = null;

self.onmessage = (e) => {
  const { type, url } = e.data;

  if (type === "connect") {
    if (ws) ws.close();

    ws = new WebSocket(url);
    ws.binaryType = "arraybuffer";

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer && event.data.byteLength >= TRAIN_POSITION_SIZE) {
        const view = new DataView(event.data);
        const trainId = view.getInt32(0);
        const lng = view.getFloat32(4);
        const lat = view.getFloat32(8);
        const bearing = view.getInt16(12);
        const delay = view.getInt16(14);

        self.postMessage({
          type: "position",
          data: { trainId, lng, lat, bearing, delay },
        });
      }
    };

    ws.onopen = () => self.postMessage({ type: "connected" });
    ws.onclose = () => self.postMessage({ type: "disconnected" });
    ws.onerror = () => self.postMessage({ type: "error" });
  } else if (type === "disconnect") {
    if (ws) { ws.close(); ws = null; }
  }
};
`;

async function loadMockTrains(): Promise<Map<number, { train_id: number; longitude: number; latitude: number; bearing: number; delay: number }>> {
  const res = await fetch("/data/mock_trains.json");
  const data = await res.json();
  const mockPositions = new Map<number, { train_id: number; longitude: number; latitude: number; bearing: number; delay: number }>();
  data.trains.forEach((t: { train_id: number; longitude: number; latitude: number; bearing: number; delay: number }) => mockPositions.set(t.train_id, t));
  return mockPositions;
}

function createWorker(): { worker: Worker; revoke: () => void } | null {
  try {
    const blob = new Blob([WORKER_CODE], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    return { worker, revoke: () => URL.revokeObjectURL(url) };
  } catch {
    return null;
  }
}

export function useWebSocket() {
  const [positions, setPositions] = useState<Map<number, InterpolatedPosition>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const animFrameRef = useRef<number>(0);
  const latestPositionsRef = useRef<Map<number, { trainId: number; lng: number; lat: number; bearing: number; delay: number }>>(new Map());
  const flushRef = useRef<(() => void) | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    if (USE_MOCK_TELEMETRY) {
      loadMockTrains().then((mockPositions) => {
        for (const [trainId, pos] of mockPositions) {
          updateTrainTarget(trainId, {
            train_id: trainId,
            longitude: pos.longitude,
            latitude: pos.latitude,
            bearing: pos.bearing,
            delay: pos.delay,
          });
        }
        setPositions(getAllInterpolatedPositions());
        setIsConnected(true);
      });
      return;
    }

    const result = createWorker();

    if (result) {
      const { worker, revoke } = result;
      workerRef.current = worker;

      worker.onmessage = (e) => {
        if (e.data.type === "position") {
          latestPositionsRef.current.set(e.data.data.trainId, e.data.data);
        } else if (e.data.type === "connected") {
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
        } else if (e.data.type === "disconnected" || e.data.type === "error") {
          setIsConnected(false);
          attemptReconnect();
        }
      };

      worker.postMessage({ type: "connect", url: WS_URL });

      return () => {
        worker.postMessage({ type: "disconnect" });
        worker.terminate();
        revoke();
      };
    }

    // Fallback: direct WebSocket if worker creation fails
    const ws = new WebSocket(WS_URL);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    ws.onclose = () => {
      setIsConnected(false);
      attemptReconnect();
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        const view = new DataView(event.data);
        if (event.data.byteLength >= TRAIN_POSITION_SIZE) {
          const trainId = view.getInt32(0);
          const lng = view.getFloat32(4);
          const lat = view.getFloat32(8);
          const bearing = view.getInt16(12);
          const delay = view.getInt16(14);

          latestPositionsRef.current.set(trainId, { trainId, lng, lat, bearing, delay });
        }
      }
    };

    return () => {
      ws.close();
    };
  };

  const attemptReconnect = () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    reconnectAttemptsRef.current += 1;

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  };

  const reconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectAttemptsRef.current = 0;
    connect();
  };

  useEffect(() => {
    const flushUpdates = () => {
      const latest = latestPositionsRef.current;
      if (latest.size > 0) {
        for (const [, pos] of latest) {
          updateTrainTarget(pos.trainId, {
            train_id: pos.trainId,
            longitude: pos.lng,
            latitude: pos.lat,
            bearing: pos.bearing,
            delay: pos.delay,
          });
        }
        latestPositionsRef.current.clear();
      }
      setPositions(getAllInterpolatedPositions());
      animFrameRef.current = requestAnimationFrame(flushUpdates);
    };

    flushRef.current = flushUpdates;
    animFrameRef.current = requestAnimationFrame(flushUpdates);

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      cancelAnimationFrame(animFrameRef.current);
      if (workerRef.current) {
        workerRef.current.postMessage({ type: "disconnect" });
        workerRef.current.terminate();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { positions, isConnected, reconnect };
}
