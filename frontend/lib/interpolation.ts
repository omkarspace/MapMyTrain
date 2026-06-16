import { TrainPosition } from "./types";

const INGESTION_INTERVAL_MS = 120_000;

interface InterpolationState {
  previousLng: number;
  previousLat: number;
  previousBearing: number;
  targetLng: number;
  targetLat: number;
  targetBearing: number;
  delay: number;
  timestamp: number;
}

export interface InterpolatedPosition {
  longitude: number;
  latitude: number;
  bearing: number;
  delay: number;
}

const trainStates = new Map<number, InterpolationState>();

export function updateTrainTarget(trainId: number, pos: TrainPosition): void {
  const existing = trainStates.get(trainId);
  const now = Date.now();

  if (existing) {
    trainStates.set(trainId, {
      previousLng: existing.targetLng,
      previousLat: existing.targetLat,
      previousBearing: existing.targetBearing,
      targetLng: pos.longitude,
      targetLat: pos.latitude,
      targetBearing: pos.bearing,
      delay: pos.delay,
      timestamp: now,
    });
  } else {
    trainStates.set(trainId, {
      previousLng: pos.longitude,
      previousLat: pos.latitude,
      previousBearing: pos.bearing,
      targetLng: pos.longitude,
      targetLat: pos.latitude,
      targetBearing: pos.bearing,
      delay: pos.delay,
      timestamp: now,
    });
  }
}

export function getInterpolatedPosition(trainId: number): InterpolatedPosition | null {
  const state = trainStates.get(trainId);
  if (!state) return null;

  const now = Date.now();
  const elapsed = now - state.timestamp;
  const t = Math.min(elapsed / INGESTION_INTERVAL_MS, 1);

  const eased = easeInOutCubic(t);

  return {
    longitude: lerp(state.previousLng, state.targetLng, eased),
    latitude: lerp(state.previousLat, state.targetLat, eased),
    bearing: lerpAngle(state.previousBearing, state.targetBearing, eased),
    delay: state.delay,
  };
}

export function removeTrainState(trainId: number): void {
  trainStates.delete(trainId);
}

export function getAllInterpolatedPositions(): Map<number, InterpolatedPosition> {
  const result = new Map<number, InterpolatedPosition>();
  for (const [trainId] of trainStates) {
    const pos = getInterpolatedPosition(trainId);
    if (pos) {
      result.set(trainId, pos);
    }
  }
  return result;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  let result = a + diff * t;
  if (result < 0) result += 360;
  if (result >= 360) result -= 360;
  return result;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
