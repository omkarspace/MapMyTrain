import MapCanvas from "@/components/map/MapCanvas";
import { MapProvider } from "@/components/map/MapContext";
import TrackLayer from "@/components/map/TrackLayer";
import StatusBar from "@/components/ui/StatusBar";
import WebSocketProvider from "@/providers/WebSocketProvider";

export default function Home() {
  return (
    <main className="relative w-full h-screen bg-slate-950">
      <WebSocketProvider>
        <MapProvider>
          <MapCanvas />
          <TrackLayer />
          <StatusBar />
        </MapProvider>
      </WebSocketProvider>
    </main>
  );
}
