"use client";

import { createContext, useContext, ReactNode } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { InterpolatedPosition } from "@/lib/interpolation";

interface WebSocketContextType {
  positions: Map<number, InterpolatedPosition>;
  isConnected: boolean;
  reconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  positions: new Map(),
  isConnected: false,
  reconnect: () => {},
});

export function useTrainPositions() {
  return useContext(WebSocketContext);
}

export default function WebSocketProvider({ children }: { children: ReactNode }) {
  const { positions, isConnected, reconnect } = useWebSocket();

  return (
    <WebSocketContext.Provider value={{ positions, isConnected, reconnect }}>
      {children}
    </WebSocketContext.Provider>
  );
}
