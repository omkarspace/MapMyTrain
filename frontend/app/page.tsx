"use client";

import { TerrainProvider, useTerrain } from "@/providers/TerrainProvider";
import MapCanvas from "@/components/map/MapCanvas";
import { MapProvider, useMap } from "@/components/map/MapContext";
import TrackLayer from "@/components/map/TrackLayer";
import BuildingLayer from "@/components/map/BuildingLayer";
import StationLayer from "@/components/map/StationLayer";
import AtmosphereLayer from "@/components/map/AtmosphereLayer";
import Train3DLayer from "@/components/map/Train3DLayer";
import TerrainLayer from "@/components/map/TerrainLayer";
import MapViewController from "@/components/MapViewController";
import TerrainToggle from "@/components/ui/TerrainToggle";
import ThemeToggle from "@/components/ui/ThemeToggle";
import KeyboardShortcutsHelp from "@/components/ui/KeyboardShortcutsHelp";
import WebSocketProvider from "@/providers/WebSocketProvider";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useTheme } from "@/providers/ThemeProvider";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { AlertTriangle } from "lucide-react";
import { OfflineIndicator } from "@/components/ui/OfflineIndicator";
import { useTrainPositions } from "@/providers/WebSocketProvider";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "MapMyTrain",
  description:
    "Track Indian Railway trains in real-time on an interactive WebGL map. See live train positions, delays, timetables, and route maps.",
  url: "https://mapmytrain.com",
  applicationCategory: "TravelApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
  },
  featureList: [
    "Real-time train tracking",
    "Interactive WebGL map",
    "Binary WebSocket streaming",
    "LERP interpolation",
    "Train timetable and delay status",
    "3D terrain visualization",
    "Route search between stations",
  ],
  softwareVersion: "1.0.0",
  author: {
    "@type": "Organization",
    name: "MapMyTrain Contributors",
    url: "https://github.com/omkarspace/MapMyTrain",
  },
  keywords:
    "Indian Railways, train tracking, live train status, real-time train map, Indian train tracker, train delay status, railway map India, train running status, open source train tracker",
};

function MapLayers() {
  const { terrainEnabled } = useTerrain();
  const { map } = useMap();
  const { toggleTheme } = useTheme();
  const { isConnected, reconnect } = useTrainPositions();

  useKeyboardShortcuts({
    onToggleTheme: toggleTheme,
    onZoomIn: () => {
      if (map) {
        map.zoomIn();
      }
    },
    onZoomOut: () => {
      if (map) {
        map.zoomOut();
      }
    },
    onResetView: () => {
      if (map) {
        map.flyTo({
          center: [78.9629, 22.5937],
          zoom: 5,
        });
      }
    },
  });

  return (
    <>
      <MapCanvas />
      <AtmosphereLayer />
      <BuildingLayer />
      <TrackLayer />
      <StationLayer />
      <Train3DLayer />
      <TerrainLayer enabled={terrainEnabled} />
      <MapViewController />
      <TerrainToggle />
      <ThemeToggle />
      <KeyboardShortcutsHelp />
      <OfflineIndicator isWebSocketConnected={isConnected} onRetry={reconnect} />
      <div className="vignette-overlay" />
    </>
  );
}

export default function Home() {
  return (
    <main className="relative w-full h-screen bg-white dark:bg-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <WebSocketProvider>
        <MapProvider>
          <TerrainProvider>
            <ErrorBoundary
              fallback={
                <div className="flex flex-col items-center justify-center h-full bg-slate-50 dark:bg-slate-950">
                  <AlertTriangle className="w-16 h-16 text-amber-500 mb-4" />
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Map Loading Error
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 mb-4">
                    Failed to load the map. Please refresh the page.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Refresh Page
                  </button>
                </div>
              }
            >
              <MapLayers />
            </ErrorBoundary>
          </TerrainProvider>
        </MapProvider>
      </WebSocketProvider>
    </main>
  );
}
