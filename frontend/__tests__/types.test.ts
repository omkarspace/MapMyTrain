import { Train, TrainPosition, Station } from "@/lib/types";

describe("Type Definitions", () => {
  it("should create a valid Train object", () => {
    const train: Train = {
      train_number: "12301",
      train_name: "Rajdhani Express",
      source_station_code: "NDLS",
      destination_station_code: "HWH",
      runs_on_days: "1111100",
      average_delay: 12,
    };

    expect(train.train_number).toBe("12301");
    expect(train.train_name).toBe("Rajdhani Express");
  });

  it("should create a valid TrainPosition object", () => {
    const position: TrainPosition = {
      train_id: 12301,
      longitude: 77.209,
      latitude: 28.6139,
      bearing: 45,
      delay: 12,
    };

    expect(position.train_id).toBe(12301);
    expect(position.bearing).toBe(45);
  });

  it("should create a valid Station object", () => {
    const station: Station = {
      station_code: "NDLS",
      station_name: "New Delhi",
      division: "Northern Railway",
      zone: "NR",
      longitude: 77.209,
      latitude: 28.6139,
    };

    expect(station.station_code).toBe("NDLS");
  });
});

describe("Constants", () => {
  it("should have map center for India", async () => {
    const { MAP_CENTER, MAP_ZOOM } = await import("@/lib/constants");
    expect(MAP_CENTER).toEqual([78.9629, 22.5937]);
    expect(MAP_ZOOM).toBe(5);
  });
});
