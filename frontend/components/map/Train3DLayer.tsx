"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import maplibregl from "maplibre-gl";
import { useMap } from "./MapContext";
import { useTrainPositions } from "@/providers/WebSocketProvider";
import { createTrainConsist, createTrainGeometry, TrainConsist } from "./TrainModel";
import { getBlendedLightingConfig, getCurrentIST } from "@/lib/lighting";

const TRAIN_ZOOM_THRESHOLD = 13;
const LOD_LOW_ZOOM = 10;
const COACH_SPACING = 0.6;
const modelCache = new Map<string, THREE.Group>();

interface TrainInstance {
  trainId: number;
  locomotive: THREE.Group;
  coaches: THREE.Group[];
  headlights: THREE.PointLight[];
  taillights: THREE.PointLight[];
  pathPoints: Array<{ lng: number; lat: number; bearing: number }>;
  simplifiedLocomotive?: THREE.Group;
  birthTime: number;
}

function createHeadlights(): THREE.PointLight[] {
  return [
    new THREE.PointLight(0xfff4cc, 0, 2, 2),
    new THREE.PointLight(0xfff4cc, 0, 2, 2),
  ];
}

function createTaillights(): THREE.PointLight[] {
  return [
    new THREE.PointLight(0xff3333, 0, 1.5, 1.5),
    new THREE.PointLight(0xff3333, 0, 1.5, 1.5),
  ];
}

function buildSplinePath(
  pathHistory: Array<{ lng: number; lat: number; bearing: number }>,
  targetLng: number,
  targetLat: number,
  bearing: number
): THREE.CatmullRomCurve3 | null {
  const points: THREE.Vector3[] = [];
  for (const p of pathHistory) {
    points.push(new THREE.Vector3(p.lng, p.lat, 0));
  }
  points.push(new THREE.Vector3(targetLng, targetLat, 0));

  const rad = (-bearing * Math.PI) / 180;
  const dx = Math.cos(rad) * 0.005;
  const dy = Math.sin(rad) * 0.005;
  points.push(new THREE.Vector3(targetLng + dx, targetLat + dy, 0));
  points.push(new THREE.Vector3(targetLng + dx * 2, targetLat + dy * 2, 0));

  if (points.length < 2) return null;
  return new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
}

function lerpPosition(
  current: { lng: number; lat: number },
  target: { lng: number; lat: number },
  t: number
): { lng: number; lat: number } {
  return {
    lng: current.lng + (target.lng - current.lng) * t,
    lat: current.lat + (target.lat - current.lat) * t,
  };
}

export default function Train3DLayer() {
  const { map } = useMap();
  const { positions } = useTrainPositions();
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const trainsRef = useRef<Map<number, TrainInstance>>(new Map());
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const interpolationsRef = useRef<Map<number, { from: THREE.Vector3; to: THREE.Vector3; progress: number }>>(new Map());
  const customLayerId = "train-3d-layer";

  useEffect(() => {
    if (!map) return;

    const layerSpec: maplibregl.CustomLayerInterface = {
      id: customLayerId,
      type: "custom",
      renderingMode: "3d",

      onAdd: function () {
        const gl = map.getCanvas().getContext("webgl2") || map.getCanvas().getContext("webgl");
        if (!gl) return;

        sceneRef.current = new THREE.Scene();
        cameraRef.current = new THREE.PerspectiveCamera();

        rendererRef.current = new THREE.WebGLRenderer({
          canvas: map.getCanvas(),
          context: gl,
          antialias: true,
        });
        rendererRef.current.autoClear = false;

        const config = getBlendedLightingConfig();

        const ambientLight = new THREE.AmbientLight(config.ambientColor, config.ambientIntensity);
        sceneRef.current.add(ambientLight);
        ambientLightRef.current = ambientLight;

        const dirLight = new THREE.DirectionalLight(config.directionalColor, config.directionalIntensity);
        dirLight.position.set(10, 20, 10);
        sceneRef.current.add(dirLight);
        dirLightRef.current = dirLight;

        const hemiLight = new THREE.HemisphereLight(
          new THREE.Color(config.skyTopColor),
          new THREE.Color(config.fogColor),
          config.hemisphereIntensity
        );
        sceneRef.current.add(hemiLight);
        hemiLightRef.current = hemiLight;
      },

      render: function (_gl: WebGLRenderingContext, options: maplibregl.CustomRenderMethodInput) {
        if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

        const m = new THREE.Matrix4().fromArray(options.modelViewProjectionMatrix as number[]);
        cameraRef.current.projectionMatrix = m;

        const time = getCurrentIST();
        const config = getBlendedLightingConfig(time);

        if (ambientLightRef.current) {
          ambientLightRef.current.color.set(config.ambientColor);
          ambientLightRef.current.intensity = config.ambientIntensity;
        }
        if (dirLightRef.current) {
          dirLightRef.current.color.set(config.directionalColor);
          dirLightRef.current.intensity = config.directionalIntensity;
        }
        if (hemiLightRef.current) {
          hemiLightRef.current.color.set(config.skyTopColor);
          hemiLightRef.current.groundColor.set(config.fogColor);
          hemiLightRef.current.intensity = config.hemisphereIntensity;
        }

        const isNight = time.phase === "night" || time.phase === "dusk";
        const isDawn = time.phase === "dawn";
        const currentZoom = map.getZoom();
        const show3D = currentZoom >= TRAIN_ZOOM_THRESHOLD;

        const nightFactor = isNight ? 1.0 : isDawn ? 0.3 : 0;
        const headlightIntensity = show3D ? 1.5 * nightFactor : 0;
        const taillightIntensity = show3D ? 0.8 * nightFactor : 0;

        trainsRef.current.forEach((instance) => {
          for (const hl of instance.headlights) {
            hl.intensity = headlightIntensity;
          }
          for (const tl of instance.taillights) {
            tl.intensity = taillightIntensity;
          }
        });

        if (show3D) {
          const interpolationSpeed = 0.15;
          const entryAnimDuration = 500;
          const bounds = map.getBounds();
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();
          const padLng = (ne.lng - sw.lng) * 0.05;
          const padLat = (ne.lat - sw.lat) * 0.05;

          trainsRef.current.forEach((instance) => {
            const pos = positions.get(instance.trainId);
            if (!pos) return;

            const inView =
              pos.longitude >= sw.lng - padLng &&
              pos.longitude <= ne.lng + padLng &&
              pos.latitude >= sw.lat - padLat &&
              pos.latitude <= ne.lat + padLat;
            if (!inView) {
              instance.locomotive.visible = false;
              for (const coach of instance.coaches) {
                coach.visible = false;
              }
              return;
            }

            const age = Date.now() - instance.birthTime;
            const entryProgress = Math.min(age / entryAnimDuration, 1);
            const entryEased = entryProgress < 1
              ? entryProgress * entryProgress * (3 - 2 * entryProgress)
              : 1;

            const targetPos = new THREE.Vector3(pos.longitude, pos.latitude, 0);

            let interpolation = interpolationsRef.current.get(instance.trainId);
            if (!interpolation) {
              interpolation = {
                from: targetPos.clone(),
                to: targetPos.clone(),
                progress: 1,
              };
              interpolationsRef.current.set(instance.trainId, interpolation);
            }

            if (interpolation.progress >= 1) {
              interpolation.from.copy(interpolation.to);
              interpolation.to.copy(targetPos);
              interpolation.progress = 0;
            }

            interpolation.progress = Math.min(interpolation.progress + interpolationSpeed, 1);
            const eased = interpolation.progress * interpolation.progress * (3 - 2 * interpolation.progress);
            const smoothPos = lerpPosition(
              { lng: interpolation.from.x, lat: interpolation.from.y },
              { lng: interpolation.to.x, lat: interpolation.to.y },
              eased
            );

            instance.pathPoints.push({ lng: smoothPos.lng, lat: smoothPos.lat, bearing: pos.bearing });
            if (instance.pathPoints.length > 8) {
              instance.pathPoints.shift();
            }

            const path = buildSplinePath(instance.pathPoints, smoothPos.lng, smoothPos.lat, pos.bearing);
            const totalUnits = instance.coaches.length + 1;
            const coachSpacing = 1.0 / totalUnits;

            const locomotivePos = path ? path.getPointAt(0) : new THREE.Vector3(smoothPos.lng, smoothPos.lat, 0);
            const locomotiveTangent = path ? path.getTangentAt(0) : new THREE.Vector3(1, 0, 0);
            const locomotiveAngle = Math.atan2(locomotiveTangent.y, locomotiveTangent.x);

            const mercator0 = maplibregl.MercatorCoordinate.fromLngLat([locomotivePos.x, locomotivePos.y], 0);
            const baseScale = mercator0.meterInMercatorCoordinateUnits();
            const scale = baseScale * entryEased;

            instance.locomotive.matrix.identity();
            instance.locomotive.matrix.scale(new THREE.Vector3(scale, scale, scale));
            instance.locomotive.matrix.multiply(new THREE.Matrix4().makeRotationZ(-locomotiveAngle));
            instance.locomotive.matrix.multiply(new THREE.Matrix4().makeTranslation(mercator0.x, mercator0.y, mercator0.z));
            instance.locomotive.matrixAutoUpdate = false;
            instance.locomotive.matrixWorldNeedsUpdate = true;
            instance.locomotive.visible = entryEased > 0.01;

            const useSimplified = currentZoom < LOD_LOW_ZOOM && instance.simplifiedLocomotive;
            const visibleLocomotive = useSimplified ? instance.simplifiedLocomotive! : instance.locomotive;
            visibleLocomotive.visible = true;

            for (let i = 0; i < instance.coaches.length; i++) {
              const progress = (i + 1) * coachSpacing;
              const t = Math.min(progress, 0.99);

              let coachLng: number;
              let coachLat: number;
              let coachAngle: number;

              if (path) {
                const pt = path.getPointAt(t);
                const tangent = path.getTangentAt(t);
                coachLng = pt.x;
                coachLat = pt.y;
                coachAngle = Math.atan2(tangent.y, tangent.x);
              } else {
                const offset = (i + 1) * COACH_SPACING;
                const rad = (-pos.bearing * Math.PI) / 180;
                coachLng = smoothPos.lng - Math.cos(rad) * offset * 0.00001;
                coachLat = smoothPos.lat - Math.sin(rad) * offset * 0.00001;
                coachAngle = (-pos.bearing * Math.PI) / 180;
              }

              const mercator = maplibregl.MercatorCoordinate.fromLngLat([coachLng, coachLat], 0);

              instance.coaches[i].matrix.identity();
              instance.coaches[i].matrix.scale(new THREE.Vector3(scale, scale, scale));
              instance.coaches[i].matrix.multiply(new THREE.Matrix4().makeRotationZ(-coachAngle));
              instance.coaches[i].matrix.multiply(new THREE.Matrix4().makeTranslation(mercator.x, mercator.y, mercator.z));
              instance.coaches[i].matrixAutoUpdate = false;
              instance.coaches[i].matrixWorldNeedsUpdate = true;
              instance.coaches[i].visible = entryEased > 0.01;
            }

            const headlightT = 0.01;
            const hlPoint = path ? path.getPointAt(headlightT) : locomotivePos;
            const hlMercator = maplibregl.MercatorCoordinate.fromLngLat([hlPoint.x, hlPoint.y], 0);
            const hlScale = hlMercator.meterInMercatorCoordinateUnits();

            instance.headlights[0].position.set(0.4 * hlScale, 0.15 * hlScale, 0.06 * hlScale);
            instance.headlights[1].position.set(0.4 * hlScale, 0.15 * hlScale, -0.06 * hlScale);

            const tailT = Math.max(0.99 - instance.coaches.length * coachSpacing, 0);
            const tailPoint = path ? path.getPointAt(tailT) : locomotivePos;

            instance.taillights[0].position.set(0, 0.15 * hlScale, 0.06 * hlScale);
            instance.taillights[1].position.set(0, 0.15 * hlScale, -0.06 * hlScale);
            instance.taillights[0].position.x += (tailPoint.x - hlPoint.x) * 111320 * Math.cos((tailPoint.y * Math.PI) / 180);
            instance.taillights[1].position.x = instance.taillights[0].position.x;
          });

          rendererRef.current.resetState();
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
        map.triggerRepaint();
      },
    };

    if (map.isStyleLoaded()) {
      map.addLayer(layerSpec, "water" as unknown as string);
    } else {
      map.on("load", () => {
        try {
          map.addLayer(layerSpec, "water" as unknown as string);
        } catch {
          // Layer may already exist
        }
      });
    }

    const currentInterpolations = interpolationsRef.current;

    return () => {
      if (map.getLayer(customLayerId)) {
        map.removeLayer(customLayerId);
      }
      if (sceneRef.current) {
        sceneRef.current.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        });
      }
      rendererRef.current?.dispose();
      modelCache.clear();
      currentInterpolations.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    const currentInterpolations = interpolationsRef.current;
    const existingIds = new Set(trainsRef.current.keys());
    const newIds = new Set(positions.keys());

    for (const trainId of existingIds) {
      if (!newIds.has(trainId)) {
        const instance = trainsRef.current.get(trainId);
        if (instance) {
          scene.remove(instance.locomotive);
          instance.locomotive.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
              obj.geometry.dispose();
              if (Array.isArray(obj.material)) {
                obj.material.forEach((m) => m.dispose());
              } else {
                obj.material.dispose();
              }
            }
          });
          for (const coach of instance.coaches) {
            scene.remove(coach);
            coach.traverse((obj) => {
              if (obj instanceof THREE.Mesh) {
                obj.geometry.dispose();
                if (Array.isArray(obj.material)) {
                  obj.material.forEach((m) => m.dispose());
                } else {
                  obj.material.dispose();
                }
              }
            });
          }
          if (instance.simplifiedLocomotive) {
            scene.remove(instance.simplifiedLocomotive);
            instance.simplifiedLocomotive.traverse((obj) => {
              if (obj instanceof THREE.Mesh) {
                obj.geometry.dispose();
                if (Array.isArray(obj.material)) {
                  obj.material.forEach((m) => m.dispose());
                } else {
                  obj.material.dispose();
                }
              }
            });
          }
          trainsRef.current.delete(trainId);
          currentInterpolations.delete(trainId);
        }
      }
    }

    for (const trainId of newIds) {
      if (!existingIds.has(trainId)) {
        const pos = positions.get(trainId);
        if (!pos) continue;

        const trainType = trainId % 3 === 0 ? "freight" : trainId % 2 === 0 ? "rajdhani" : "passenger";
        const coachCount = trainType === "freight" ? 12 : trainType === "rajdhani" ? 8 : 10;
        const consist: TrainConsist = createTrainConsist({ type: trainType, coachCount });

        const simplifiedLoco = createTrainGeometry({
          variant: trainType === "rajdhani" ? "rajdhani" : "普通",
          scale: 0.8,
        });

        scene.add(consist.locomotive);
        for (const coach of consist.coaches) {
          scene.add(coach);
        }
        scene.add(simplifiedLoco);

        const headlights = createHeadlights();
        for (const hl of headlights) {
          scene.add(hl);
        }

        const taillights = createTaillights();
        for (const tl of taillights) {
          scene.add(tl);
        }

        trainsRef.current.set(trainId, {
          trainId,
          locomotive: consist.locomotive,
          coaches: consist.coaches,
          headlights,
          taillights,
          pathPoints: [{ lng: pos.longitude, lat: pos.latitude, bearing: pos.bearing }],
          simplifiedLocomotive: simplifiedLoco,
          birthTime: Date.now(),
        });
      }
    }
  }, [positions]);

  return null;
}
