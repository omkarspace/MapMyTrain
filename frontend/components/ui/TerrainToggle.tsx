"use client";

import { Mountain, MountainSnow } from "lucide-react";
import { useTerrain } from "@/providers/TerrainProvider";

export default function TerrainToggle() {
  const { terrainEnabled, toggleTerrain } = useTerrain();

  return (
    <div className="control-3d-panel">
      <button
        onClick={toggleTerrain}
        className={`control-3d-btn ${terrainEnabled ? "active" : ""}`}
        title={terrainEnabled ? "Disable terrain" : "Enable terrain"}
      >
        {terrainEnabled ? <MountainSnow size={18} /> : <Mountain size={18} />}
      </button>
    </div>
  );
}
