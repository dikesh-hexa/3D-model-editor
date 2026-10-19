import React, { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { observer } from "mobx-react-lite";
import { LoadedModel } from "../../components/viewport/LoadedModel";
import { Loader } from "../../components/viewport/Loader";
import { Env } from "../../components/viewport/Env";
import { NormalizedModelGroup } from "../../components/viewport/NormalizedModelGroup";
import type { AdminModelItem } from "../store/ModelCatalogManager";
import type { FinishPreset } from "../../types/types";
import { buildMaterialMap } from "../../utils/finishUtils";

interface AdminPreviewProps {
  model: AdminModelItem;
  presets: FinishPreset[];
  activeFinishId: string | null;
  onSelectFinish: (finishId: string) => void;
}

export const AdminPreview: React.FC<AdminPreviewProps> = observer(
  ({ model, presets, activeFinishId }) => {
    const modelRef = useRef<THREE.Group | null>(null);

    // Active finish previewed on the model (from clicking colors in the detail list)
    const activePreset = activeFinishId
      ? presets.find((p) => p.id === activeFinishId)
      : model.defaultFinishId
      ? presets.find((p) => p.id === model.defaultFinishId)
      : null;

    const currentMaterialCombination = activePreset
      ? {
          id: 1,
          name: activePreset.name,
          defaultCrimp: activePreset.defaultCrimp,
          materialMap: buildMaterialMap(
            {
              id: model.id,
              name: model.name,
              url: model.url,
              category: model.category,
              meshes: model.meshes,
              overrides: model.overrides,
            },
            activePreset
          ),
        }
      : null;

    return (
      <div className="flex flex-col h-full bg-gray-900 rounded-xl overflow-hidden border border-gray-800 relative">
        {/* Clean top bar displaying model name & active preview color */}
        <div className="bg-gray-800/90 backdrop-blur px-3 py-2 flex items-center justify-between z-10 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold text-gray-300">
              {model.name}
            </span>
            <span className="text-[10px] text-gray-500 font-mono">
              ({model.category})
            </span>
          </div>

          <div className="flex items-center space-x-1.5 text-xs">
            <span className="text-gray-400 text-[11px]">Preview Color:</span>
            {activePreset ? (
              <span className="font-bold text-blue-400 bg-blue-950/60 border border-blue-500/30 px-2 py-0.5 rounded text-[11px]">
                {activePreset.name}
              </span>
            ) : (
              <span className="text-gray-500 italic text-[11px]">
                Default Mesh Color
              </span>
            )}
          </div>
        </div>

        {/* 3D Viewport */}
        <div className="flex-1 relative">
          <Canvas
            camera={{ position: [0, 2, 7.5], fov: 45, near: 0.1, far: 15 }}
            shadows
            gl={{
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 0.9,
            }}
          >
            <Suspense fallback={<Loader />}>
              <Env />
              <NormalizedModelGroup targetSize={3.5}>
                <LoadedModel
                  key={`${model.url}-${activePreset?.id || "default"}`}
                  url={model.url}
                  onModelLoaded={() => {}}
                  modelRef={modelRef}
                  selectedMeshUuid={null}
                  selectedMaterial={currentMaterialCombination}
                  selectedCrimpColor={null}
                  currentModel={model as any}
                />
              </NormalizedModelGroup>
            </Suspense>

            <OrbitControls makeDefault minDistance={4} maxDistance={12} />
          </Canvas>
        </div>
      </div>
    );
  }
);
