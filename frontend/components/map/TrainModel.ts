import * as THREE from "three";

const INDIAN_RAILWAYS_BLUE = new THREE.Color(0x1a3a6b);
const INDIAN_RAILWAYS_CREAM = new THREE.Color(0xf5f0dc);
const INDIAN_RAILWAYS_STRIPE = new THREE.Color(0xd97706);
const HEADLIGHT_COLOR = new THREE.Color(0xfff4cc);

const COACH_BLUE = new THREE.Color(0x1a3a6b);
const COACH_CREAM = new THREE.Color(0xf5f0dc);
const COACH_RED = new THREE.Color(0x8b1a1a);
const FREIGHT_GREY = new THREE.Color(0x555555);

export interface TrainModelOptions {
  variant?: "rajdhani" | "shatabdi" | "普通" | "freight";
  scale?: number;
}

export interface TrainConsistOptions {
  type?: "passenger" | "freight" | "rajdhani";
  coachCount?: number;
  scale?: number;
}

export interface TrainConsist {
  locomotive: THREE.Group;
  coaches: THREE.Group[];
  totalLength: number;
}

export function createCoach(type: "passenger" | "freight" | "rajdhani"): THREE.Group {
  const group = new THREE.Group();

  let bodyColor: THREE.Color;
  let hasWindows = true;

  switch (type) {
    case "rajdhani":
      bodyColor = COACH_RED;
      break;
    case "freight":
      bodyColor = FREIGHT_GREY;
      hasWindows = false;
      break;
    default:
      bodyColor = COACH_BLUE;
  }

  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    metalness: 0.3,
    roughness: 0.7,
  });

  const bodyGeo = new THREE.BoxGeometry(0.5, 0.22, 0.14);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0.11, 0);
  group.add(body);

  const roofGeo = new THREE.BoxGeometry(0.48, 0.025, 0.13);
  const roofMat = new THREE.MeshStandardMaterial({
    color: COACH_CREAM,
    metalness: 0.1,
    roughness: 0.8,
  });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 0.235, 0);
  group.add(roof);

  const stripeMat = new THREE.MeshStandardMaterial({
    color: INDIAN_RAILWAYS_STRIPE,
    metalness: 0.2,
    roughness: 0.6,
  });
  const stripeGeo = new THREE.BoxGeometry(0.48, 0.02, 0.15);
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  stripe.position.set(0, 0.12, 0);
  group.add(stripe);

  if (hasWindows) {
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      metalness: 0.9,
      roughness: 0.1,
    });
    const windowGeo = new THREE.BoxGeometry(0.008, 0.05, 0.10);
    const windowSpacing = 0.06;
    const windowCount = 6;

    for (let i = 0; i < windowCount; i++) {
      const x = -0.15 + i * windowSpacing;

      const windowL = new THREE.Mesh(windowGeo, windowMat);
      windowL.position.set(x, 0.16, 0.07);
      group.add(windowL);

      const windowR = new THREE.Mesh(windowGeo, windowMat);
      windowR.position.set(x, 0.16, -0.07);
      group.add(windowR);
    }
  }

  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.8,
    roughness: 0.3,
  });
  const wheelGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.015, 10);
  const wheelPositions = [-0.15, -0.05, 0.05, 0.15];

  for (const x of wheelPositions) {
    const wheelL = new THREE.Mesh(wheelGeo, wheelMat);
    wheelL.rotation.x = Math.PI / 2;
    wheelL.position.set(x, 0.0, 0.065);
    group.add(wheelL);

    const wheelR = new THREE.Mesh(wheelGeo, wheelMat);
    wheelR.rotation.x = Math.PI / 2;
    wheelR.position.set(x, 0.0, -0.065);
    group.add(wheelR);
  }

  const underframeGeo = new THREE.BoxGeometry(0.45, 0.03, 0.11);
  const underframe = new THREE.Mesh(underframeGeo, wheelMat);
  underframe.position.set(0, 0.015, 0);
  group.add(underframe);

  if (type === "freight") {
    const containerGeo = new THREE.BoxGeometry(0.44, 0.18, 0.12);
    const containerMat = new THREE.MeshStandardMaterial({
      color: 0x664422,
      metalness: 0.1,
      roughness: 0.9,
    });
    const container = new THREE.Mesh(containerGeo, containerMat);
    container.position.set(0, 0.22, 0);
    group.add(container);
  }

  return group;
}

export function createTrainConsist(options: TrainConsistOptions = {}): TrainConsist {
  const { type = "passenger", coachCount = 8, scale = 1 } = options;

  const locomotive = createTrainGeometry({ variant: type === "rajdhani" ? "rajdhani" : "普通", scale: 1 });

  const coaches: THREE.Group[] = [];
  const coachLength = 0.55;
  const gap = 0.05;

  for (let i = 0; i < coachCount; i++) {
    const coach = createCoach(type);
    coach.position.x = -(i + 1) * (coachLength + gap);
    coaches.push(coach);
  }

  const totalLength = (coachCount + 1) * coachLength + coachCount * gap;

  const root = new THREE.Group();
  root.add(locomotive);
  for (const coach of coaches) {
    root.add(coach);
  }

  root.scale.setScalar(scale);

  return { locomotive, coaches, totalLength };
}

export function createTrainGeometry(options: TrainModelOptions = {}): THREE.Group {
  const { variant = "rajdhani", scale = 1 } = options;
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: variant === "shatabdi" ? new THREE.Color(0xc0c0c0) : INDIAN_RAILWAYS_BLUE,
    metalness: 0.3,
    roughness: 0.7,
  });

  const creamMat = new THREE.MeshStandardMaterial({
    color: INDIAN_RAILWAYS_CREAM,
    metalness: 0.1,
    roughness: 0.8,
  });

  const stripeMat = new THREE.MeshStandardMaterial({
    color: INDIAN_RAILWAYS_STRIPE,
    metalness: 0.2,
    roughness: 0.6,
    emissive: INDIAN_RAILWAYS_STRIPE,
    emissiveIntensity: 0.1,
  });

  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.8,
    roughness: 0.3,
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: HEADLIGHT_COLOR,
    emissive: HEADLIGHT_COLOR,
    emissiveIntensity: 0.8,
  });

  // Main body
  const bodyGeo = new THREE.BoxGeometry(0.6, 0.25, 0.15);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0.12, 0);
  group.add(body);

  // Roof (cream stripe)
  const roofGeo = new THREE.BoxGeometry(0.55, 0.03, 0.14);
  const roof = new THREE.Mesh(roofGeo, creamMat);
  roof.position.set(0, 0.26, 0);
  group.add(roof);

  // Side stripe
  const stripeGeo = new THREE.BoxGeometry(0.55, 0.025, 0.16);
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  stripe.position.set(0, 0.14, 0);
  group.add(stripe);

  // Cab (front section)
  const cabGeo = new THREE.BoxGeometry(0.12, 0.3, 0.14);
  const cab = new THREE.Mesh(cabGeo, bodyMat);
  cab.position.set(0.32, 0.15, 0);
  group.add(cab);

  // Cab windows
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    metalness: 0.9,
    roughness: 0.1,
  });
  const windowGeo = new THREE.BoxGeometry(0.01, 0.06, 0.10);
  const windowL = new THREE.Mesh(windowGeo, windowMat);
  windowL.position.set(0.38, 0.18, 0);
  group.add(windowL);

  // Headlight
  const headlightGeo = new THREE.SphereGeometry(0.015, 8, 8);
  const headlight = new THREE.Mesh(headlightGeo, headlightMat);
  headlight.position.set(0.39, 0.15, 0);
  group.add(headlight);

  // Rear light (red)
  const rearLightMat = new THREE.MeshStandardMaterial({
    color: 0xff3333,
    emissive: 0xff3333,
    emissiveIntensity: 0.4,
  });
  const rearLight = new THREE.Mesh(headlightGeo, rearLightMat);
  rearLight.position.set(-0.31, 0.15, 0);
  group.add(rearLight);

  // Underframe
  const underframeGeo = new THREE.BoxGeometry(0.5, 0.04, 0.12);
  const underframe = new THREE.Mesh(underframeGeo, wheelMat);
  underframe.position.set(0, 0.02, 0);
  group.add(underframe);

  // Wheels (4 axles)
  const wheelGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12);
  const wheelPositions = [-0.18, -0.06, 0.06, 0.18];
  for (const x of wheelPositions) {
    const wheelL = new THREE.Mesh(wheelGeo, wheelMat);
    wheelL.rotation.x = Math.PI / 2;
    wheelL.position.set(x, 0.0, 0.07);
    group.add(wheelL);

    const wheelR = new THREE.Mesh(wheelGeo, wheelMat);
    wheelR.rotation.x = Math.PI / 2;
    wheelR.position.set(x, 0.0, -0.07);
    group.add(wheelR);
  }

  // Pantograph (for electric locomotives)
  if (variant !== "freight") {
    const pantographMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.9,
      roughness: 0.2,
    });

    const pantBaseGeo = new THREE.BoxGeometry(0.02, 0.08, 0.02);
    const pantBaseL = new THREE.Mesh(pantBaseGeo, pantographMat);
    pantBaseL.position.set(0.05, 0.3, 0.03);
    group.add(pantBaseL);

    const pantBaseR = new THREE.Mesh(pantBaseGeo, pantographMat);
    pantBaseR.position.set(0.05, 0.3, -0.03);
    group.add(pantBaseR);

    const pantTopGeo = new THREE.BoxGeometry(0.06, 0.01, 0.08);
    const pantTop = new THREE.Mesh(pantTopGeo, pantographMat);
    pantTop.position.set(0.05, 0.35, 0);
    group.add(pantTop);
  }

  group.scale.setScalar(scale);
  return group;
}

export function createTrainMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: INDIAN_RAILWAYS_BLUE,
    metalness: 0.3,
    roughness: 0.7,
  });
}

export function getTrainColorByDelay(delay: number): string {
  if (delay <= 5) return "#22c55e";
  if (delay <= 15) return "#eab308";
  return "#ef4444";
}
