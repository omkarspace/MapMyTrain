import type { FeatureCollection, Feature, Point, Polygon } from "geojson";

export interface StationProperties {
  station_code: string;
  station_name: string;
  type: "junction" | "terminal" | "regular";
  platforms: number;
}


function makeStationWithPlatforms(
  lng: number,
  lat: number,
  widthM: number,
  heightM: number,
  platformWidthM: number = 140,
  platformHeightM: number = 16
): Polygon {
  const dLng = widthM / (111320 * Math.cos((lat * Math.PI) / 180));
  const dLat = heightM / 110540;
  const pLng = platformWidthM / (111320 * Math.cos((lat * Math.PI) / 180));
  const pLat = platformHeightM / 110540;

  return {
    type: "Polygon",
    coordinates: [
      [
        [lng - pLng / 2, lat - pLat / 2],
        [lng + pLng / 2, lat - pLat / 2],
        [lng + pLng / 2, lat - dLat / 2],
        [lng + dLng / 2, lat - dLat / 2],
        [lng + dLng / 2, lat + dLat / 2],
        [lng + pLng / 2, lat + dLat / 2],
        [lng + pLng / 2, lat + pLat / 2],
        [lng - pLng / 2, lat + pLat / 2],
        [lng - pLng / 2, lat + dLat / 2],
        [lng - dLng / 2, lat + dLat / 2],
        [lng - dLng / 2, lat - dLat / 2],
        [lng - pLng / 2, lat - pLat / 2],
      ],
    ],
  };
}

function stationFeature(
  code: string,
  name: string,
  lng: number,
  lat: number,
  type: StationProperties["type"],
  platforms: number,
  widthM = 100,
  heightM = 60
): Feature<Polygon, StationProperties> {
  return {
    type: "Feature",
    geometry: makeStationWithPlatforms(lng, lat, widthM, heightM),
    properties: {
      station_code: code,
      station_name: name,
      type,
      platforms,
    },
  };
}

function stationPoint(
  code: string,
  name: string,
  lng: number,
  lat: number,
  type: StationProperties["type"],
  platforms: number
): Feature<Point, StationProperties> {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: {
      station_code: code,
      station_name: name,
      type,
      platforms,
    },
  };
}

export const MAJOR_STATIONS: FeatureCollection<Polygon, StationProperties> = {
  type: "FeatureCollection",
  features: [
    stationFeature("NDLS", "New Delhi", 77.2218, 28.6443, "junction", 16, 200, 80),
    stationFeature("BCT", "Mumbai Central", 72.8354, 18.9690, "terminal", 7, 120, 60),
    stationFeature("CSTM", "Mumbai CST", 72.8355, 18.9398, "terminal", 18, 180, 70),
    stationFeature("HWH", "Howrah Junction", 88.3464, 22.5804, "junction", 23, 220, 80),
    stationFeature("MAS", "Chennai Central", 80.2785, 13.0827, "terminal", 12, 160, 70),
    stationFeature("SBC", "KSR Bengaluru", 77.5715, 12.9762, "junction", 10, 140, 60),
    stationFeature("SC", "Secunderabad Junction", 78.4867, 17.4399, "junction", 10, 140, 60),
    stationFeature("NZM", "Hazrat Nizamuddin", 77.2480, 28.5908, "junction", 8, 120, 60),
    stationFeature("BBS", "Bhubaneswar", 85.8262, 20.2961, "junction", 6, 120, 60),
    stationFeature("PUNE", "Pune Junction", 73.8800, 18.5286, "junction", 6, 120, 60),
    stationFeature("JP", "Jaipur Junction", 75.7873, 26.9196, "junction", 6, 120, 60),
    stationFeature("ADI", "Ahmedabad Junction", 72.6347, 23.0225, "junction", 8, 140, 60),
    stationFeature("LKO", "Lucknow NR", 80.9463, 26.8467, "junction", 6, 120, 60),
    stationFeature("BPL", "Bhopal Junction", 77.4392, 23.2311, "junction", 6, 120, 60),
    stationFeature("NGP", "Nagpur Junction", 79.0882, 21.1458, "junction", 6, 120, 60),
    stationFeature("PTA", "Patna Junction", 85.1376, 25.6111, "junction", 6, 120, 60),
    stationFeature("GHY", "Guwahati", 91.7362, 26.1445, "junction", 4, 100, 50),
    stationFeature("JAT", "Jammu Tawi", 74.8691, 32.7158, "terminal", 4, 100, 50),
    stationFeature("ASR", "Amritsar Junction", 74.8713, 31.6200, "junction", 6, 120, 60),
    stationFeature("CNB", "Kanpur Central", 80.3480, 26.4499, "junction", 8, 120, 60),
    stationFeature("ALY", "Prayagraj Junction", 81.8339, 25.4358, "junction", 6, 120, 60),
    stationFeature("BKN", "Bikaner Junction", 73.2947, 28.0237, "junction", 4, 100, 50),
    stationFeature("JU", "Jodhpur Junction", 73.0242, 26.2867, "junction", 4, 100, 50),
    stationFeature("UDZ", "Udaipur City", 73.6821, 24.5854, "regular", 4, 100, 50),
    stationFeature("RTM", "Ratlam Junction", 75.1257, 23.3341, "junction", 4, 100, 50),
    stationFeature("KOTA", "Kota Junction", 75.8681, 25.2138, "junction", 4, 100, 50),
    stationFeature("INDB", "Indore Junction", 75.8572, 22.7171, "junction", 4, 100, 50),
    stationFeature("R", "Raipur Junction", 81.6296, 21.2514, "junction", 4, 100, 50),
    stationFeature("VSKP", "Visakhapatnam", 83.2185, 17.7215, "junction", 4, 100, 50),
    stationFeature("TPTY", "Tirupati", 79.4926, 13.6288, "regular", 4, 100, 50),
    stationFeature("RC", "Raichur Junction", 77.3411, 16.2046, "junction", 4, 100, 50),
    stationFeature("MYS", "Mysuru Junction", 76.6530, 12.3116, "junction", 4, 100, 50),
    stationFeature("MAQ", "Mangalore Central", 74.8632, 12.8689, "terminal", 4, 100, 50),
    stationFeature("ERS", "Ernakulam Junction", 76.2678, 9.9766, "junction", 4, 100, 50),
    stationFeature("TVC", "Thiruvananthapuram Central", 76.9558, 8.4879, "terminal", 4, 100, 50),
    stationFeature("CLT", "Kozhikode", 75.7805, 11.2588, "regular", 4, 100, 50),
    stationFeature("SRTN", "Satna Junction", 80.8374, 24.5649, "junction", 4, 100, 50),
    stationFeature("JBP", "Jabalpur", 79.9501, 23.1827, "junction", 4, 100, 50),
    stationFeature("MAO", "Madgaon Junction", 73.9575, 15.2689, "junction", 4, 100, 50),
    stationFeature("ST", "Surat", 72.8311, 21.1958, "regular", 4, 100, 50),
    stationFeature("BRC", "Vadodara Junction", 73.1812, 22.3107, "junction", 6, 120, 60),
    stationFeature("ET", "Itarsi Junction", 77.7602, 22.6157, "junction", 6, 120, 60),
    stationFeature("JHS", "Jhansi Junction", 79.5508, 25.4484, "junction", 6, 120, 60),
  ],
};

export const MAJOR_STATION_POINTS: FeatureCollection<Point, StationProperties> = {
  type: "FeatureCollection",
  features: [
    stationPoint("NDLS", "New Delhi", 77.2218, 28.6443, "junction", 16),
    stationPoint("BCT", "Mumbai Central", 72.8354, 18.9690, "terminal", 7),
    stationPoint("CSTM", "Mumbai CST", 72.8355, 18.9398, "terminal", 18),
    stationPoint("HWH", "Howrah Junction", 88.3464, 22.5804, "junction", 23),
    stationPoint("MAS", "Chennai Central", 80.2785, 13.0827, "terminal", 12),
    stationPoint("SBC", "KSR Bengaluru", 77.5715, 12.9762, "junction", 10),
    stationPoint("SC", "Secunderabad Junction", 78.4867, 17.4399, "junction", 10),
    stationPoint("NZM", "Hazrat Nizamuddin", 77.2480, 28.5908, "junction", 8),
    stationPoint("BBS", "Bhubaneswar", 85.8262, 20.2961, "junction", 6),
    stationPoint("PUNE", "Pune Junction", 73.8800, 18.5286, "junction", 6),
    stationPoint("JP", "Jaipur Junction", 75.7873, 26.9196, "junction", 6),
    stationPoint("ADI", "Ahmedabad Junction", 72.6347, 23.0225, "junction", 8),
    stationPoint("LKO", "Lucknow NR", 80.9463, 26.8467, "junction", 6),
    stationPoint("BPL", "Bhopal Junction", 77.4392, 23.2311, "junction", 6),
    stationPoint("NGP", "Nagpur Junction", 79.0882, 21.1458, "junction", 6),
    stationPoint("PTA", "Patna Junction", 85.1376, 25.6111, "junction", 6),
    stationPoint("GHY", "Guwahati", 91.7362, 26.1445, "junction", 4),
    stationPoint("JAT", "Jammu Tawi", 74.8691, 32.7158, "terminal", 4),
    stationPoint("ASR", "Amritsar Junction", 74.8713, 31.6200, "junction", 6),
    stationPoint("CNB", "Kanpur Central", 80.3480, 26.4499, "junction", 8),
    stationPoint("ALY", "Prayagraj Junction", 81.8339, 25.4358, "junction", 6),
    stationPoint("BKN", "Bikaner Junction", 73.2947, 28.0237, "junction", 4),
    stationPoint("JU", "Jodhpur Junction", 73.0242, 26.2867, "junction", 4),
    stationPoint("UDZ", "Udaipur City", 73.6821, 24.5854, "regular", 4),
    stationPoint("RTM", "Ratlam Junction", 75.1257, 23.3341, "junction", 4),
    stationPoint("KOTA", "Kota Junction", 75.8681, 25.2138, "junction", 4),
    stationPoint("INDB", "Indore Junction", 75.8572, 22.7171, "junction", 4),
    stationPoint("R", "Raipur Junction", 81.6296, 21.2514, "junction", 4),
    stationPoint("VSKP", "Visakhapatnam", 83.2185, 17.7215, "junction", 4),
    stationPoint("TPTY", "Tirupati", 79.4926, 13.6288, "regular", 4),
    stationPoint("RC", "Raichur Junction", 77.3411, 16.2046, "junction", 4),
    stationPoint("MYS", "Mysuru Junction", 76.6530, 12.3116, "junction", 4),
    stationPoint("MAQ", "Mangalore Central", 74.8632, 12.8689, "terminal", 4),
    stationPoint("ERS", "Ernakulam Junction", 76.2678, 9.9766, "junction", 4),
    stationPoint("TVC", "Thiruvananthapuram Central", 76.9558, 8.4879, "terminal", 4),
    stationPoint("CLT", "Kozhikode", 75.7805, 11.2588, "regular", 4),
    stationPoint("SRTN", "Satna Junction", 80.8374, 24.5649, "junction", 4),
    stationPoint("JBP", "Jabalpur", 79.9501, 23.1827, "junction", 4),
    stationPoint("MAO", "Madgaon Junction", 73.9575, 15.2689, "junction", 4),
    stationPoint("ST", "Surat", 72.8311, 21.1958, "regular", 4),
    stationPoint("BRC", "Vadodara Junction", 73.1812, 22.3107, "junction", 6),
    stationPoint("ET", "Itarsi Junction", 77.7602, 22.6157, "junction", 6),
    stationPoint("JHS", "Jhansi Junction", 79.5508, 25.4484, "junction", 6),
  ],
};
