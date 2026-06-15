"use client";

import { createContext, useContext, ReactNode } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { TrainPosition } from "@/lib/types";

interface WebSocketContextType {
  positions: Map<number, TrainPosition>;
}

const WebSocketContext = createContext<WebSocketContextType>({ positions: new Map() });

export function useTrainPositions() {
  return useContext(WebSocketContext);
}

export default function WebSocketProvider({ children }: { children: ReactNode }) {
  const { positions } = useWebSocket();

  return (
    <WebSocketContext.Provider value={{ positions }}>
      {children}
    </WebSocketContext.Provider>
  );
}
