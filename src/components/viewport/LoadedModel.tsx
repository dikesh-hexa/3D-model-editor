import { useEffect, useMemo, memo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { LoadedModelProps } from "../../types/types";
import materialsDataRaw from "../../data/materials.json";
import partAliasesData from "../../data/partAliases.json";
import { resolvePart } from "../../utils/finishUtils";
import { sharedMaterialCache } from "../../utils/materialCache";

const materialsData = materialsDataRaw.materials;

interface SubMeshProps {
  node: THREE.Mesh;
  selectedMaterial: any;
  selectedCrimpColor: any;
  isSelected: boolean;
  baseMaterial: THREE.Material | null;
  currentModel?: any;
}

const SubMeshMaterialLoader = memo(
  ({
    node,
    selectedMaterial,
    selectedCrimpColor,
    isSelected,
    baseMaterial,
    currentModel,
  }: SubMeshProps) => {
    // Resolve part dynamically with alias fallback (exact first, then priority regex)
    const detectedPart = resolvePart(node.name, currentModel, partAliasesData as any);
    const isCrimpOrCollarMesh =
      detectedPart === "Crimp" ||
      detectedPart === "Socket" ||
      detectedPart === "Press Lock" ||
      node.name === "Crimp" ||
      node.name === "Socket";

    // Direct match by node name or by resolved part in materialMap
    const mappedColorName = selectedMaterial
      ? selectedMaterial.materialMap[node.name] ||
        (detectedPart ? selectedMaterial.materialMap[detectedPart] : null)
      : null;

    const matItem = mappedColorName
      ? materialsData.find(
          (m) => m.name.toLowerCase() === mappedColorName.toLowerCase()
        )
      : null;

    const highlightMaterial = useMemo(() => {
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xf97316),
        roughness: 0.2,
        metalness: 0.8,
      });
    }, []);

    const activeMaterial = useMemo(() => {
      if (isSelected) {
        return highlightMaterial;
      }

      // 1. Determine the target color code for this mesh
      let targetColorCode: string | null = null;
      if (isCrimpOrCollarMesh && selectedCrimpColor) {
        targetColorCode = selectedCrimpColor.colorCode;
      } else if (matItem?.colorCode) {
        targetColorCode = matItem.colorCode;
      }

      // 2. If we have our universal base material, retrieve or clone via sharedMaterialCache
      if (baseMaterial && targetColorCode) {
        return sharedMaterialCache.getOrCreateMaterial(
          targetColorCode,
          baseMaterial
        );
      } else if (baseMaterial) {
        return baseMaterial;
      }

      // 3. Fallback to original GLTF material
      return node.material;
    }, [
      isSelected,
      highlightMaterial,
      isCrimpOrCollarMesh,
      selectedCrimpColor,
      matItem,
      baseMaterial,
      node.material,
    ]);

    // Handle selection outline declaratively
    const edgesGeometry = useMemo(() => {
      if (isSelected && node.geometry) {
        return new THREE.EdgesGeometry(node.geometry);
      }
      return null;
    }, [isSelected, node.geometry]);

    return (
      <mesh
        geometry={node.geometry}
        material={activeMaterial}
        position={node.position}
        rotation={node.rotation}
        scale={node.scale}
        name={node.name}
        userData={node.userData}
      >
        {isSelected && edgesGeometry && (
          <lineSegments geometry={edgesGeometry}>
            <lineBasicMaterial
              color={0xf97316}
              linewidth={2}
              depthTest={false}
              transparent={true}
            />
          </lineSegments>
        )}
      </mesh>
    );
  }
);

export function LoadedModel({
  url,
  onModelLoaded,
  modelRef,
  selectedMeshUuid,
  selectedMaterial,
  selectedCrimpColor,
  currentModel,
}: LoadedModelProps) {
  // Apply encodeURI so paths containing spaces or '&' (e.g. SB&PROBlack Models) load cleanly
  const safeUrl = useMemo(() => {
    return url.startsWith("blob:") ? url : encodeURI(url);
  }, [url]);

  // Load the main model
  const { scene, nodes } = useGLTF(safeUrl);

  // Load the single universal material GLB
  const materialGltf = useGLTF("/models/Rendering/material.glb");
  const baseMaterial = useMemo(() => {
    if (materialGltf && materialGltf.materials) {
      const matValues = Object.values(materialGltf.materials);
      if (matValues.length > 0) {
        return matValues[0];
      }
    }
    return null;
  }, [materialGltf]);

  useEffect(() => {
    if (scene) {
      if (modelRef) {
        (modelRef as React.MutableRefObject<typeof scene>).current = scene;
      }
      onModelLoaded(scene);
      window.dispatchEvent(new CustomEvent("model-loaded"));
    }
  }, [scene, onModelLoaded, modelRef]);

  return (
    <group>
      {Object.values(nodes).map((node) => {
        if ((node as THREE.Mesh).isMesh) {
          const meshNode = node as THREE.Mesh;
          return (
            <SubMeshMaterialLoader
              key={meshNode.uuid}
              node={meshNode}
              selectedMaterial={selectedMaterial}
              selectedCrimpColor={selectedCrimpColor}
              isSelected={selectedMeshUuid === meshNode.uuid}
              baseMaterial={baseMaterial}
              currentModel={currentModel}
            />
          );
        }
        return null;
      })}
    </group>
  );
}

// Preload the universal material
useGLTF.preload("/models/Rendering/material.glb");
