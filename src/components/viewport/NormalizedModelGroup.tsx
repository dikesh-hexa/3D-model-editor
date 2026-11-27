import React, { useRef, useLayoutEffect, useState } from "react";
import * as THREE from "three";
import { ContactShadows } from "@react-three/drei";
import { EXCLUDE_FROM_BOUNDS } from "../../utils/dimensionUtils";

interface NormalizedModelGroupProps {
  children: React.ReactNode;
  /** The target maximum dimension (width, height, or depth) that the model should scale to */
  targetSize?: number;
  /** Whether to show contact shadows below the model (default: true) */
  showShadow?: boolean;
  /** Opacity of the contact shadow (default: 0.65) */
  shadowOpacity?: number;
}

/**
 * Wraps a 3D model and automatically normalizes its size and position.
 * Regardless of how big the original mesh is, this component scales it
 * to exactly `targetSize` and perfectly centers it at [0, 0, 0].
 * It also dynamically positions a soft ContactShadow plane directly beneath
 * the bottom base of the model.
 */
export function NormalizedModelGroup({
  children,
  targetSize = 5,
  showShadow = true,
  shadowOpacity = 0.65,
}: NormalizedModelGroupProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [minY, setMinY] = useState<number>(-1.75);

  useLayoutEffect(() => {
    if (!groupRef.current) return;

    // 1. Reset scale and position in case this runs multiple times
    groupRef.current.scale.setScalar(1);
    groupRef.current.position.set(0, 0, 0);

    // Ensure the matrix is fully updated with the reset values
    groupRef.current.updateMatrixWorld(true);

    // 2. Calculate the bounding box of the loaded model
    // Dimension overlays (flagged with userData.excludeFromBounds) must not
    // influence the model's size/centering.
    const box = new THREE.Box3();
    const tmp = new THREE.Box3();
    const walk = (o: THREE.Object3D) => {
      if (o.userData?.[EXCLUDE_FROM_BOUNDS]) return;
      const geo = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
      if (geo) {
        if (!geo.boundingBox) geo.computeBoundingBox();
        if (geo.boundingBox) box.union(tmp.copy(geo.boundingBox).applyMatrix4(o.matrixWorld));
      }
      o.children.forEach(walk);
    };
    walk(groupRef.current);
    if (box.isEmpty()) return;

    // 3. Find its current center and size
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    if (maxDim > 0) {
      // 4. Calculate the ratio needed to make its max dimension exactly `targetSize`
      const scale = targetSize / maxDim;

      // 5. Apply the uniform scale
      groupRef.current.scale.setScalar(scale);

      // 6. Apply a negative offset so that the visual center becomes [0, 0, 0]
      // We must multiply the offset by the scale since the object itself is being scaled
      groupRef.current.position.copy(center).multiplyScalar(-scale);

      // 7. Calculate the exact bottom of the model in world space
      const computedMinY = -(size.y * scale) / 2;
      setMinY(computedMinY);
    }
  }, [children, targetSize]);

  return (
    <>
      <group ref={groupRef}>{children}</group>
      {showShadow && (
        <ContactShadows
          position={[0, minY - 0.1, 0]}
          opacity={shadowOpacity}
          scale={10}
          blur={2}
          far={4.5}
          resolution={512}
          color="#000000"
        />
      )}
    </>
  );
}
