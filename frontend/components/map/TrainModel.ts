import * as THREE from "three";

const INDIAN_RAILWAYS_BLUE = new THREE.Color(0x1a3a6b);
const INDIAN_RAILWAYS_CREAM = new THREE.Color(0xf5f0dc);
const INDIAN_RAILWAYS_STRIPE = new THREE.Color(0xd97706);
const HEADLIGHT_COLOR = new THREE.Color(0xfff4cc);

const COACH_BLUE = new THREE.Color(0x1a3a6b);
const COACH_CREAM = new THREE.Color(0xf5f0dc);
const COACH_LHB_RED = new THREE.Color(0xb91c1c);
const FREIGHT_GREY = new THREE.Color(0x555555);
const FREIGHT_BROWN = new THREE.Color(0x6b4423);

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

function createWheelBogie(): THREE.Group {
  const bogie = new THREE.Group();
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    metalness: 0.85,
    roughness: 0.25,
  });
  const axleMat = new THREE.MeshStandardMaterial({
    color: 0x444444,
    metalness: 0.9,
    roughness: 0.2,
  });

  const wheelGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.018, 16);
  const axleGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.14, 8);

  const axle = new THREE.Mesh(axleGeo, axleMat);
  axle.rotation.x = Math.PI / 2;
  axle.position.y = 0.0;
  bogie.add(axle);

  const wheelPositions = [-0.06, 0.06];
  for (const z of wheelPositions) {
    const wheelL = new THREE.Mesh(wheelGeo, wheelMat);
    wheelL.rotation.x = Math.PI / 2;
    wheelL.position.set(0, 0.0, 0.065 + z * 0.3);
    bogie.add(wheelL);

    const wheelR = new THREE.Mesh(wheelGeo, wheelMat);
    wheelR.rotation.x = Math.PI / 2;
    wheelR.position.set(0, 0.0, -(0.065 + z * 0.3));
    bogie.add(wheelR);
  }

  const frameGeo = new THREE.BoxGeometry(0.14, 0.015, 0.12);
  const frame = new THREE.Mesh(frameGeo, axleMat);
  frame.position.y = 0.01;
  bogie.add(frame);

  return bogie;
}

function createCoupling(): THREE.Group {
  const coupling = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x555555,
    metalness: 0.8,
    roughness: 0.3,
  });

  const barGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.06, 6);
  const bar = new THREE.Mesh(barGeo, mat);
  bar.rotation.z = Math.PI / 2;
  bar.position.y = 0.06;
  coupling.add(bar);

  const hookGeo = new THREE.BoxGeometry(0.015, 0.02, 0.015);
  const hookL = new THREE.Mesh(hookGeo, mat);
  hookL.position.set(0.03, 0.06, 0);
  coupling.add(hookL);

  const hookR = new THREE.Mesh(hookGeo, mat);
  hookR.position.set(-0.03, 0.06, 0);
  coupling.add(hookR);

  return coupling;
}

export function createCoach(type: "passenger" | "freight" | "rajdhani"): THREE.Group {
  const group = new THREE.Group();

  let bodyColor: THREE.Color;
  let hasWindows = true;
  let hasAC = false;

  switch (type) {
    case "rajdhani":
      bodyColor = COACH_LHB_RED;
      hasAC = true;
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
    roughness: 0.65,
  });

  const bodyGeo = new THREE.BoxGeometry(0.52, 0.23, 0.14);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0.115, 0);
  group.add(body);

  const roofMat = new THREE.MeshStandardMaterial({
    color: COACH_CREAM,
    metalness: 0.1,
    roughness: 0.8,
  });
  const roofGeo = new THREE.BoxGeometry(0.50, 0.025, 0.13);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 0.24, 0);
  group.add(roof);

  const stripeMat = new THREE.MeshStandardMaterial({
    color: INDIAN_RAILWAYS_STRIPE,
    metalness: 0.2,
    roughness: 0.6,
  });
  const stripeGeo = new THREE.BoxGeometry(0.50, 0.018, 0.15);
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  stripe.position.set(0, 0.12, 0);
  group.add(stripe);

  if (hasWindows) {
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      metalness: 0.9,
      roughness: 0.1,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.4,
      roughness: 0.5,
    });
    const windowGeo = new THREE.BoxGeometry(0.008, 0.045, 0.09);
    const frameGeo = new THREE.BoxGeometry(0.01, 0.05, 0.10);
    const windowSpacing = 0.055;
    const windowCount = 7;

    for (let i = 0; i < windowCount; i++) {
      const x = -0.16 + i * windowSpacing;

      const frameL = new THREE.Mesh(frameGeo, frameMat);
      frameL.position.set(x, 0.16, 0.07);
      group.add(frameL);

      const windowL = new THREE.Mesh(windowGeo, windowMat);
      windowL.position.set(x, 0.16, 0.071);
      group.add(windowL);

      const frameR = new THREE.Mesh(frameGeo, frameMat);
      frameR.position.set(x, 0.16, -0.07);
      group.add(frameR);

      const windowR = new THREE.Mesh(windowGeo, windowMat);
      windowR.position.set(x, 0.16, -0.071);
      group.add(windowR);
    }

    if (hasAC) {
      const acUnitMat = new THREE.MeshStandardMaterial({
        color: 0xdddddd,
        metalness: 0.3,
        roughness: 0.6,
      });
      const acGeo = new THREE.BoxGeometry(0.08, 0.02, 0.06);
      const acPositions = [-0.12, 0.0, 0.12];
      for (const x of acPositions) {
        const acUnit = new THREE.Mesh(acGeo, acUnitMat);
        acUnit.position.set(x, 0.265, 0);
        group.add(acUnit);
      }
    }
  }

  if (type === "freight") {
    const containerGeo = new THREE.BoxGeometry(0.46, 0.16, 0.12);
    const containerMat = new THREE.MeshStandardMaterial({
      color: FREIGHT_BROWN,
      metalness: 0.1,
      roughness: 0.9,
    });
    const container = new THREE.Mesh(containerGeo, containerMat);
    container.position.set(0, 0.21, 0);
    group.add(container);

    const ribCount = 6;
    const ribGeo = new THREE.BoxGeometry(0.008, 0.16, 0.13);
    const ribMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      metalness: 0.4,
      roughness: 0.5,
    });
    for (let i = 0; i < ribCount; i++) {
      const x = -0.18 + i * 0.072;
      const ribL = new THREE.Mesh(ribGeo, ribMat);
      ribL.position.set(x, 0.21, 0.065);
      group.add(ribL);
      const ribR = new THREE.Mesh(ribGeo, ribMat);
      ribR.position.set(x, 0.21, -0.065);
      group.add(ribR);
    }
  }

  const underframeMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.8,
    roughness: 0.3,
  });
  const underframeGeo = new THREE.BoxGeometry(0.48, 0.025, 0.11);
  const underframe = new THREE.Mesh(underframeGeo, underframeMat);
  underframe.position.set(0, 0.015, 0);
  group.add(underframe);

  const bogieL = createWheelBogie();
  bogieL.position.set(-0.17, 0.0, 0);
  group.add(bogieL);

  const bogieR = createWheelBogie();
  bogieR.position.set(0.17, 0.0, 0);
  group.add(bogieR);

  const couplingL = createCoupling();
  couplingL.position.set(0.27, 0.0, 0);
  group.add(couplingL);

  const couplingR = createCoupling();
  couplingR.position.set(-0.27, 0.0, 0);
  group.add(couplingR);

  return group;
}

export function createTrainConsist(options: TrainConsistOptions = {}): TrainConsist {
  const { type = "passenger", coachCount = 8, scale = 1 } = options;

  const locomotive = createTrainGeometry({
    variant: type === "rajdhani" ? "rajdhani" : "普通",
    scale: 1,
  });

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

  const isElectric = variant !== "freight";
  const isRajdhani = variant === "rajdhani";

  const bodyMat = new THREE.MeshStandardMaterial({
    color: variant === "shatabdi"
      ? new THREE.Color(0xc0c0c0)
      : isRajdhani
        ? COACH_LHB_RED
        : INDIAN_RAILWAYS_BLUE,
    metalness: 0.3,
    roughness: 0.65,
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
    color: 0x222222,
    metalness: 0.85,
    roughness: 0.25,
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: HEADLIGHT_COLOR,
    emissive: HEADLIGHT_COLOR,
    emissiveIntensity: 0.8,
  });

  const bodyGeo = new THREE.BoxGeometry(0.62, 0.26, 0.15);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0.13, 0);
  group.add(body);

  const roofGeo = new THREE.BoxGeometry(0.56, 0.03, 0.14);
  const roof = new THREE.Mesh(roofGeo, creamMat);
  roof.position.set(0, 0.27, 0);
  group.add(roof);

  const stripeGeo = new THREE.BoxGeometry(0.56, 0.022, 0.16);
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  stripe.position.set(0, 0.145, 0);
  group.add(stripe);

  const cabGeo = new THREE.BoxGeometry(0.10, 0.30, 0.14);
  const cab = new THREE.Mesh(cabGeo, bodyMat);
  cab.position.set(0.34, 0.15, 0);
  group.add(cab);

  const noseGeo = new THREE.BoxGeometry(0.06, 0.22, 0.12);
  const nose = new THREE.Mesh(noseGeo, bodyMat);
  nose.position.set(0.40, 0.12, 0);
  group.add(nose);

  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    metalness: 0.9,
    roughness: 0.1,
  });
  const cabWindowGeo = new THREE.BoxGeometry(0.01, 0.055, 0.10);
  const cabWindowL = new THREE.Mesh(cabWindowGeo, windowMat);
  cabWindowL.position.set(0.40, 0.17, 0);
  group.add(cabWindowL);

  const sideWindowGeo = new THREE.BoxGeometry(0.008, 0.04, 0.09);
  const sideWindowMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    metalness: 0.9,
    roughness: 0.1,
  });
  for (let i = 0; i < 4; i++) {
    const x = 0.0 + i * 0.06;
    const wL = new THREE.Mesh(sideWindowGeo, sideWindowMat);
    wL.position.set(x, 0.17, 0.076);
    group.add(wL);
    const wR = new THREE.Mesh(sideWindowGeo, sideWindowMat);
    wR.position.set(x, 0.17, -0.076);
    group.add(wR);
  }

  const grilleMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.7,
    roughness: 0.3,
  });
  const grilleGeo = new THREE.BoxGeometry(0.04, 0.06, 0.152);
  const grille = new THREE.Mesh(grilleGeo, grilleMat);
  grille.position.set(-0.15, 0.18, 0);
  group.add(grille);

  const headlightGeo = new THREE.SphereGeometry(0.015, 8, 8);
  const hlL = new THREE.Mesh(headlightGeo, headlightMat);
  hlL.position.set(0.43, 0.16, 0.04);
  group.add(hlL);
  const hlR = new THREE.Mesh(headlightGeo, headlightMat);
  hlR.position.set(0.43, 0.16, -0.04);
  group.add(hlR);

  const rearLightMat = new THREE.MeshStandardMaterial({
    color: 0xff3333,
    emissive: 0xff3333,
    emissiveIntensity: 0.4,
  });
  const rlL = new THREE.Mesh(headlightGeo, rearLightMat);
  rlL.position.set(-0.32, 0.16, 0.04);
  group.add(rlL);
  const rlR = new THREE.Mesh(headlightGeo, rearLightMat);
  rlR.position.set(-0.32, 0.16, -0.04);
  group.add(rlR);

  const underframeGeo = new THREE.BoxGeometry(0.52, 0.035, 0.12);
  const underframe = new THREE.Mesh(underframeGeo, wheelMat);
  underframe.position.set(0, 0.02, 0);
  group.add(underframe);

  const bogieL = createWheelBogie();
  bogieL.position.set(-0.18, 0.0, 0);
  group.add(bogieL);

  const bogieR = createWheelBogie();
  bogieR.position.set(0.18, 0.0, 0);
  group.add(bogieR);

  const couplingL = createCoupling();
  couplingL.position.set(0.33, 0.0, 0);
  group.add(couplingL);

  const couplingR = createCoupling();
  couplingR.position.set(-0.33, 0.0, 0);
  group.add(couplingR);

  if (isElectric) {
    const pantographMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.9,
      roughness: 0.2,
    });

    const pantBaseGeo = new THREE.BoxGeometry(0.015, 0.07, 0.015);
    const pantBaseL = new THREE.Mesh(pantBaseGeo, pantographMat);
    pantBaseL.position.set(0.05, 0.31, 0.025);
    group.add(pantBaseL);

    const pantBaseR = new THREE.Mesh(pantBaseGeo, pantographMat);
    pantBaseR.position.set(0.05, 0.31, -0.025);
    group.add(pantBaseR);

    const pantArmGeo = new THREE.BoxGeometry(0.04, 0.008, 0.008);
    const pantArmL = new THREE.Mesh(pantArmGeo, pantographMat);
    pantArmL.position.set(0.05, 0.35, 0.025);
    pantArmL.rotation.z = 0.3;
    group.add(pantArmL);

    const pantArmR = new THREE.Mesh(pantArmGeo, pantographMat);
    pantArmR.position.set(0.05, 0.35, -0.025);
    pantArmR.rotation.z = 0.3;
    group.add(pantArmR);

    const pantTopGeo = new THREE.BoxGeometry(0.05, 0.008, 0.06);
    const pantTop = new THREE.Mesh(pantTopGeo, pantographMat);
    pantTop.position.set(0.06, 0.37, 0);
    group.add(pantTop);

    const pantContactGeo = new THREE.BoxGeometry(0.04, 0.004, 0.004);
    const pantContactMat = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      metalness: 0.95,
      roughness: 0.1,
    });
    const pantContact = new THREE.Mesh(pantContactGeo, pantContactMat);
    pantContact.position.set(0.06, 0.375, 0);
    group.add(pantContact);
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
