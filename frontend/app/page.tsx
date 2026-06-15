import MapCanvas from "@/components/map/MapCanvas";
import { MapProvider } from "@/components/map/MapContext";
import TrackLayer from "@/components/map/TrackLayer";
import MapViewController from "@/components/MapViewController";
import WebSocketProvider from "@/providers/WebSocketProvider";

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

export default function Home() {
  return (
    <main className="relative w-full h-screen bg-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <WebSocketProvider>
        <MapProvider>
          <MapCanvas />
          <TrackLayer />
          <MapViewController />
        </MapProvider>
      </WebSocketProvider>
    </main>
  );
}
