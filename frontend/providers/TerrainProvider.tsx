"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface TerrainContextType {
  terrainEnabled: boolean;
  toggleTerrain: () => void;
}

const TerrainContext = createContext<TerrainContextType>({
  terrainEnabled: true,
  toggleTerrain: () => {},
});

export function useTerrain() {
  return useContext(TerrainContext);
}

export function TerrainProvider({ children }: { children: ReactNode }) {
  const [terrainEnabled, setTerrainEnabled] = useState(true);

  const toggleTerrain = useCallback(() => {
    setTerrainEnabled((prev) => !prev);
  }, []);

  return (
    <TerrainContext.Provider value={{ terrainEnabled, toggleTerrain }}>
      {children}
    </TerrainContext.Provider>
  );
}
