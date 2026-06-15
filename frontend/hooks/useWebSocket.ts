"use client";

import { useEffect, useRef, useState } from "react";
import { WS_URL, USE_MOCK_TELEMETRY } from "@/lib/constants";
import { TrainPosition } from "@/lib/types";

const TRAIN_POSITION_SIZE = 16;

async function loadMockTrains(): Promise<Map<number, TrainPosition>> {
  const res = await fetch("/data/mock_trains.json");
  const data = await res.json();
  const mockPositions = new Map<number, TrainPosition>();
  data.trains.forEach((t: TrainPosition) => mockPositions.set(t.train_id, t));
  return mockPositions;
}

export function useWebSocket() {
  const [positions, setPositions] = useState<Map<number, TrainPosition>>(new Map());
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (USE_MOCK_TELEMETRY) {
      loadMockTrains().then(setPositions);
      return;
    }

    ws.current = new WebSocket(WS_URL);
    ws.current.binaryType = "arraybuffer";

    ws.current.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        const view = new DataView(event.data);
        if (event.data.byteLength >= TRAIN_POSITION_SIZE) {
          const trainId = view.getInt32(0);
          const lng = view.getFloat32(4);
          const lat = view.getFloat32(8);
          const bearing = view.getInt16(12);
          const delay = view.getInt16(14);

          setPositions((prev) => {
            const next = new Map(prev);
            next.set(trainId, { train_id: trainId, longitude: lng, latitude: lat, bearing, delay });
            return next;
          });
        }
      }
    };

    return () => {
      ws.current?.close();
    };
  }, []);

  return { positions };
}
