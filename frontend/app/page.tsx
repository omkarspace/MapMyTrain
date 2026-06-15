import MapCanvas from "@/components/map/MapCanvas";
import TrackLayer from "@/components/map/TrackLayer";
import StatusBar from "@/components/ui/StatusBar";
import WebSocketProvider from "@/providers/WebSocketProvider";

export default function Home() {
  return (
    <main className="relative w-full h-screen bg-slate-950">
      <WebSocketProvider>
        <MapCanvas />
        <TrackLayer />
        <StatusBar />
      </WebSocketProvider>
    </main>
  );
}
