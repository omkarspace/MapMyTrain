"use client";

import { useState, useCallback } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useMapInteractions } from "@/hooks/useMapInteractions";
import { SearchBar } from "@/components/ui/SearchBar";
import { TrainDrawer } from "@/components/ui/TrainDrawer";
import StatusBar from "@/components/ui/StatusBar";
import TrainMarker from "@/components/map/TrainMarker";
import { Train } from "@/lib/types";
import { MOCK_TRAINS } from "@/lib/constants";

export default function MapViewController() {
  const { positions } = useWebSocket();
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);

  const { handleTrainClick: onTrainMarkerClick } = useMapInteractions({
    onTrainClick: (trainId: number) => {
      const train = MOCK_TRAINS.find((t) => t.train_number === String(trainId));
      if (train) {
        setSelectedTrain(train);
      }
    },
  });

  const handleTrainSelect = useCallback((train: Train) => {
    setSelectedTrain(train);
    const pos = positions.get(Number(train.train_number));
    if (pos) {
      onTrainMarkerClick(Number(train.train_number));
    }
  }, [positions, onTrainMarkerClick]);

  const handleCloseDrawer = useCallback(() => {
    setSelectedTrain(null);
  }, []);

  return (
    <>
      <SearchBar onTrainSelect={handleTrainSelect} trains={MOCK_TRAINS} />
      {Array.from(positions.entries()).map(([trainId, pos]) => (
        <TrainMarker
          key={trainId}
          position={pos}
          onClick={() => onTrainMarkerClick(trainId)}
        />
      ))}
      <TrainDrawer
        train={selectedTrain}
        position={selectedTrain ? positions.get(Number(selectedTrain.train_number)) ?? null : null}
        onClose={handleCloseDrawer}
      />
      <StatusBar />
    </>
  );
}
