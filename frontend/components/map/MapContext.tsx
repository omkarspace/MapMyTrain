"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import maplibregl from "maplibre-gl";

interface MapContextType {
  map: maplibregl.Map | null;
  setMap: (map: maplibregl.Map | null) => void;
}

const MapContext = createContext<MapContextType>({ map: null, setMap: () => {} });

export function useMap() {
  return useContext(MapContext);
}

export function MapProvider({ children }: { children: ReactNode }) {
  const [map, setMapState] = useState<maplibregl.Map | null>(null);

  const setMap = useCallback((m: maplibregl.Map | null) => {
    setMapState(m);
  }, []);

  return (
    <MapContext.Provider value={{ map, setMap }}>
      {children}
    </MapContext.Provider>
  );
}
