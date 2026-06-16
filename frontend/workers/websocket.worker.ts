const TRAIN_POSITION_SIZE = 16;

interface TrainPositionMessage {
  type: "position";
  data: {
    trainId: number;
    lng: number;
    lat: number;
    bearing: number;
    delay: number;
  };
}

let ws: WebSocket | null = null;

self.onmessage = (e: MessageEvent) => {
  const { type, url } = e.data;

  if (type === "connect") {
    if (ws) {
      ws.close();
    }

    ws = new WebSocket(url);
    ws.binaryType = "arraybuffer";

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer && event.data.byteLength >= TRAIN_POSITION_SIZE) {
        const view = new DataView(event.data);
        const trainId = view.getInt32(0);
        const lng = view.getFloat32(4);
        const lat = view.getFloat32(8);
        const bearing = view.getInt16(12);
        const delay = view.getInt16(14);

        const msg: TrainPositionMessage = {
          type: "position",
          data: { trainId, lng, lat, bearing, delay },
        };
        self.postMessage(msg);
      }
    };

    ws.onopen = () => {
      self.postMessage({ type: "connected" });
    };

    ws.onclose = () => {
      self.postMessage({ type: "disconnected" });
    };

    ws.onerror = () => {
      self.postMessage({ type: "error" });
    };
  } else if (type === "disconnect") {
    if (ws) {
      ws.close();
      ws = null;
    }
  }
};
