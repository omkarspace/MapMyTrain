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
  const workerRef = useRef<Worker | null>(null);
  const animFrameRef = useRef<number>(0);
  const latestPositionsRef = useRef<Map<number, { trainId: number; lng: number; lat: number; bearing: number; delay: number }>>(new Map());
  const flushRef = useRef<(() => void) | null>(null);

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
      });
      animFrameRef.current = requestAnimationFrame(flushUpdates);
      return () => {
        cancelAnimationFrame(animFrameRef.current);
      };
    }

    const result = createWorker();

    if (result) {
      const { worker, revoke } = result;
      workerRef.current = worker;

      worker.onmessage = (e) => {
        if (e.data.type === "position") {
          latestPositionsRef.current.set(e.data.data.trainId, e.data.data);
        }
      };

      worker.postMessage({ type: "connect", url: WS_URL });
      animFrameRef.current = requestAnimationFrame(flushUpdates);

      return () => {
        worker.postMessage({ type: "disconnect" });
        worker.terminate();
        revoke();
        cancelAnimationFrame(animFrameRef.current);
      };
    }

    // Fallback: direct WebSocket if worker creation fails
    const ws = new WebSocket(WS_URL);
    ws.binaryType = "arraybuffer";

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

    animFrameRef.current = requestAnimationFrame(flushUpdates);

    return () => {
      ws.close();
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return { positions };
}
