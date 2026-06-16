import * as THREE from "three";

export function createTrainPath(
  coordinates: [number, number][]
): THREE.CatmullRomCurve3 | null {
  if (coordinates.length < 2) return null;

  const points = coordinates.map(
    ([lng, lat]) => new THREE.Vector3(lng, lat, 0)
  );

  return new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
}

export function positionAlongPath(
  path: THREE.CatmullRomCurve3,
  progress: number
): { position: THREE.Vector3; angle: number } {
  const t = Math.max(0, Math.min(1, progress));
  const position = path.getPointAt(t);

  const tangent = path.getTangentAt(t);
  const angle = Math.atan2(tangent.y, tangent.x);

  return { position, angle };
}

export function distributeConsistAlongPath(
  path: THREE.CatmullRomCurve3,
  totalUnits: number,
  spacing: number = 0.6
): Array<{ progress: number; offset: number }> {
  const segments: Array<{ progress: number; offset: number }> = [];
  const pathLength = path.getLength();
  const unitLength = pathLength / totalUnits;

  let currentOffset = 0;
  let unitIndex = 0;

  while (currentOffset < pathLength && unitIndex < totalUnits) {
    const progress = currentOffset / pathLength;
    segments.push({ progress, offset: unitIndex * spacing });
    currentOffset += unitLength;
    unitIndex++;
  }

  return segments;
}

export function lngLatArrayToVector3(
  coords: [number, number][]
): THREE.Vector3[] {
  return coords.map(([lng, lat]) => new THREE.Vector3(lng, lat, 0));
}
