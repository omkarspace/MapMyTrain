const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const TRANSITION_WINDOW_MINUTES = 10;

export interface TimeOfDay {
  hour: number;
  minute: number;
  decimal: number;
  phase: "dawn" | "day" | "dusk" | "night";
}

export interface LightingConfig {
  ambientIntensity: number;
  directionalIntensity: number;
  hemisphereIntensity: number;
  ambientColor: string;
  directionalColor: string;
  skyTopColor: string;
  skyBottomColor: string;
  fogColor: string;
  fogDensity: number;
  starIntensity: number;
  fogRange: [number, number];
  horizonBlend: number;
}

const PHASE_RANGES: Array<{
  start: number;
  end: number;
  phase: TimeOfDay["phase"];
}> = [
  { start: 5, end: 7, phase: "dawn" },
  { start: 7, end: 17, phase: "day" },
  { start: 17, end: 19, phase: "dusk" },
  { start: 19, end: 5, phase: "night" },
];

const LIGHTING_PRESETS: Record<TimeOfDay["phase"], LightingConfig> = {
  dawn: {
    ambientIntensity: 0.5,
    directionalIntensity: 0.7,
    hemisphereIntensity: 0.4,
    ambientColor: "#ff9966",
    directionalColor: "#ffcc88",
    skyTopColor: "#1a1a3e",
    skyBottomColor: "#ff7744",
    fogColor: "#2a1a1a",
    fogDensity: 0.8,
    starIntensity: 0.1,
    fogRange: [1, 10],
    horizonBlend: 0.12,
  },
  day: {
    ambientIntensity: 0.7,
    directionalIntensity: 1.0,
    hemisphereIntensity: 0.5,
    ambientColor: "#ffffff",
    directionalColor: "#ffffee",
    skyTopColor: "#0a0a2e",
    skyBottomColor: "#1a2a4e",
    fogColor: "#0a0a1a",
    fogDensity: 0.3,
    starIntensity: 0.0,
    fogRange: [1, 14],
    horizonBlend: 0.06,
  },
  dusk: {
    ambientIntensity: 0.4,
    directionalIntensity: 0.6,
    hemisphereIntensity: 0.35,
    ambientColor: "#ff8844",
    directionalColor: "#ffaa66",
    skyTopColor: "#0a0a2e",
    skyBottomColor: "#ff5533",
    fogColor: "#1a0a0a",
    fogDensity: 0.9,
    starIntensity: 0.2,
    fogRange: [1, 9],
    horizonBlend: 0.14,
  },
  night: {
    ambientIntensity: 0.25,
    directionalIntensity: 0.3,
    hemisphereIntensity: 0.2,
    ambientColor: "#334466",
    directionalColor: "#556688",
    skyTopColor: "#050510",
    skyBottomColor: "#0a0a1a",
    fogColor: "#050508",
    fogDensity: 1.2,
    starIntensity: 0.8,
    fogRange: [1, 8],
    horizonBlend: 0.18,
  },
};

const PHASE_ORDER: TimeOfDay["phase"][] = [
  "night",
  "dawn",
  "day",
  "dusk",
  "night",
];

function getPhaseIndex(phase: TimeOfDay["phase"]): number {
  return PHASE_ORDER.indexOf(phase);
}

export function getCurrentIST(): TimeOfDay {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const hour = istNow.getHours();
  const minute = istNow.getMinutes();
  const decimal = hour + minute / 60;

  let phase: TimeOfDay["phase"] = "night";
  for (const range of PHASE_RANGES) {
    if (range.start < range.end) {
      if (decimal >= range.start && decimal < range.end) {
        phase = range.phase;
        break;
      }
    } else {
      if (decimal >= range.start || decimal < range.end) {
        phase = range.phase;
        break;
      }
    }
  }

  return { hour, minute, decimal, phase };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function getTransitionFactor(
  decimal: number,
  phaseStart: number,
  phaseEnd: number
): number {
  let midPoint: number;
  if (phaseStart < phaseEnd) {
    midPoint = (phaseStart + phaseEnd) / 2;
  } else {
    midPoint = ((phaseStart + phaseEnd + 24) / 2) % 24;
  }

  const halfWindow = TRANSITION_WINDOW_MINUTES / 60;
  const dist = Math.abs(decimal - midPoint);

  if (dist > halfWindow) return 1;
  return dist / halfWindow;
}

export function getBlendedLightingConfig(
  time?: TimeOfDay
): LightingConfig {
  const t = time ?? getCurrentIST();
  const { decimal, phase } = t;

  const currentPreset = LIGHTING_PRESETS[phase];

  const currentIdx = getPhaseIndex(phase);
  const nextPhase = PHASE_ORDER[currentIdx + 1];
  const nextPreset = LIGHTING_PRESETS[nextPhase];

  const phaseRange = PHASE_RANGES.find((r) => r.phase === phase);
  const phaseStart = phaseRange?.start ?? 0;
  const phaseEnd = phaseRange?.end ?? 0;

  const transitionFactor = getTransitionFactor(decimal, phaseStart, phaseEnd);
  const blendT = 1 - transitionFactor;

  if (blendT < 0.01) return currentPreset;

  const smoothT = blendT * blendT * (3 - 2 * blendT);

  return {
    ambientIntensity: lerp(
      currentPreset.ambientIntensity,
      nextPreset.ambientIntensity,
      smoothT
    ),
    directionalIntensity: lerp(
      currentPreset.directionalIntensity,
      nextPreset.directionalIntensity,
      smoothT
    ),
    hemisphereIntensity: lerp(
      currentPreset.hemisphereIntensity,
      nextPreset.hemisphereIntensity,
      smoothT
    ),
    ambientColor: lerpColor(
      currentPreset.ambientColor,
      nextPreset.ambientColor,
      smoothT
    ),
    directionalColor: lerpColor(
      currentPreset.directionalColor,
      nextPreset.directionalColor,
      smoothT
    ),
    skyTopColor: lerpColor(
      currentPreset.skyTopColor,
      nextPreset.skyTopColor,
      smoothT
    ),
    skyBottomColor: lerpColor(
      currentPreset.skyBottomColor,
      nextPreset.skyBottomColor,
      smoothT
    ),
    fogColor: lerpColor(
      currentPreset.fogColor,
      nextPreset.fogColor,
      smoothT
    ),
    fogDensity: lerp(
      currentPreset.fogDensity,
      nextPreset.fogDensity,
      smoothT
    ),
    starIntensity: lerp(
      currentPreset.starIntensity,
      nextPreset.starIntensity,
      smoothT
    ),
    fogRange: [
      lerp(currentPreset.fogRange[0], nextPreset.fogRange[0], smoothT),
      lerp(currentPreset.fogRange[1], nextPreset.fogRange[1], smoothT),
    ],
    horizonBlend: lerp(
      currentPreset.horizonBlend,
      nextPreset.horizonBlend,
      smoothT
    ),
  };
}

export function getLightingConfig(
  phase?: TimeOfDay["phase"]
): LightingConfig {
  const p = phase ?? getCurrentIST().phase;
  return LIGHTING_PRESETS[p];
}
