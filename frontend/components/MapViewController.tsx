"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTrainPositions } from "@/providers/WebSocketProvider";
import { useMapInteractions } from "@/hooks/useMapInteractions";
import { SearchBar } from "@/components/ui/SearchBar";
import { TrainDrawer } from "@/components/ui/TrainDrawer";
import StatusBar from "@/components/ui/StatusBar";
import TrainMarker from "@/components/map/TrainMarker";
import RouteLayer from "@/components/map/RouteLayer";
import { Train } from "@/lib/types";
import { API_BASE_URL } from "@/lib/constants";

export default function MapViewController() {
  const { positions } = useTrainPositions();
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);
  const [trains, setTrains] = useState<Train[]>([]);
  const trainsLoaded = useRef(false);

  useEffect(() => {
    if (trainsLoaded.current) return;
    trainsLoaded.current = true;
    fetch(`${API_BASE_URL}/api/v1/trains/?limit=200`)
      .then((res) => res.json())
      .then((data) => {
        if (data.trains) setTrains(data.trains);
      })
      .catch(() => {});
  }, []);

  const { handleTrainClick: onTrainMarkerClick } = useMapInteractions({
    onTrainClick: (trainId: number) => {
      const train = trains.find((t) => t.train_number === String(trainId));
      if (train) {
        setSelectedTrain(train);
      }
    },
  });

  const handleTrainSelect = useCallback(
    (train: Train) => {
      setSelectedTrain(train);
      const pos = positions.get(Number(train.train_number));
      if (pos) {
        onTrainMarkerClick(Number(train.train_number));
      }
    },
    [positions, onTrainMarkerClick]
  );

  const handleCloseDrawer = useCallback(() => {
    setSelectedTrain(null);
  }, []);

  const showMarkers = positions.size <= 50;

  return (
    <>
      <SearchBar onTrainSelect={handleTrainSelect} trains={trains} />
      <RouteLayer
        trainNumber={selectedTrain?.train_number ?? null}
      />
      {showMarkers &&
        Array.from(positions.entries()).map(([trainId, pos]) => (
          <TrainMarker
            key={trainId}
            position={pos}
            onClick={() => onTrainMarkerClick(trainId)}
          />
        ))}
      <TrainDrawer
        train={selectedTrain}
        position={
          selectedTrain
            ? positions.get(Number(selectedTrain.train_number)) ?? null
            : null
        }
        onClose={handleCloseDrawer}
      />
      <StatusBar />
    </>
  );
}
