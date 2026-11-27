import { useMemo } from "react";
import * as THREE from "three";
import { Html, Line } from "@react-three/drei";
import {
  buildDimensionLayouts,
  getFixedDimensions,
  EXCLUDE_FROM_BOUNDS,
  DIM_BLACK,
} from "../../utils/dimensionUtils";

const noRaycast = () => null;

function Arrow({ tri, color }: { tri: THREE.Vector3[]; color: string }) {
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(tri), [tri]);
  return (
    <mesh geometry={geometry} renderOrder={999} raycast={noRaycast}>
      <meshBasicMaterial color={color} side={THREE.DoubleSide} depthTest={false} toneMapped={false} />
    </mesh>
  );
}

const ALIGN_TRANSFORM = {
  center: undefined,
  left: "translate(10px, -50%)",
  right: "translate(calc(-100% - 10px), -50%)",
} as const;

/**
 * Draws the dimension overlay from the Dim_* empties of a "Manually Modelled"
 * GLB. Render it inside the model group.
 */
export function ModelDimensions({
  scene,
  modelName,
}: {
  scene: THREE.Object3D;
  modelName?: string | null;
}) {
  const layouts = useMemo(
    () => buildDimensionLayouts(scene, getFixedDimensions(modelName)),
    [scene, modelName]
  );
  if (layouts.length === 0) return null;

  return (
    <group userData={{ [EXCLUDE_FROM_BOUNDS]: true }}>
      {layouts.map((l) => (
        <group key={l.id}>
          {l.lines.map((ln, i) => (
            <Line
              key={i}
              points={ln.points}
              color={ln.color}
              lineWidth={ln.dashed ? 1.25 : 1.5}
              dashed={ln.dashed}
              dashSize={l.dashSize}
              gapSize={l.gapSize}
              depthTest={false}
              transparent
              toneMapped={false}
              renderOrder={999}
              raycast={noRaycast}
            />
          ))}
          {l.arrows.map((a, i) => (
            <Arrow key={i} tri={a.tri} color={a.color} />
          ))}
          {l.dots.map((d, i) => (
            <mesh key={i} position={d} renderOrder={999} raycast={noRaycast}>
              <sphereGeometry args={[l.dotRadius, 12, 12]} />
              <meshBasicMaterial color={DIM_BLACK} depthTest={false} toneMapped={false} />
            </mesh>
          ))}
          {l.labels.map((lb, i) => (
            <Html
              key={i}
              position={lb.position}
              center={lb.align === "center"}
              zIndexRange={[10, 0]}
              style={{ pointerEvents: "none" }}
            >
              <span
                style={{
                  color: lb.color,
                  fontWeight: 400,
                  fontSize: 16,
                  fontFamily: "Arial, Helvetica, sans-serif",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  display: "inline-block",
                  transform: ALIGN_TRANSFORM[lb.align],
                }}
              >
                {lb.text}
              </span>
            </Html>
          ))}
        </group>
      ))}
    </group>
  );
}
