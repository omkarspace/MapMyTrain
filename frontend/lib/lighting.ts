const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

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
}

const PHASE_RANGES: Array<{ start: number; end: number; phase: TimeOfDay["phase"] }> = [
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
    starIntensity: 0.6,
  },
};

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

export function getLightingConfig(phase?: TimeOfDay["phase"]): LightingConfig {
  const p = phase ?? getCurrentIST().phase;
  return LIGHTING_PRESETS[p];
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
