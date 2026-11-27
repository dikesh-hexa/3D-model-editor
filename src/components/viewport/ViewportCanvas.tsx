import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Suspense, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import { LoadedModel } from "./LoadedModel";
import { Loader } from "./Loader";
import { Env } from "./Env";
import { useMainContext } from "../../context/MainContext";
import { NormalizedModelGroup } from "./NormalizedModelGroup";
import { isManuallyModelled } from "../../utils/dimensionUtils";

export const ViewportCanvas = observer(() => {
  const stateManager = useMainContext();
  const { modelLoadManager } = stateManager.design3DManager;
  const { sideBarManager } = stateManager.designManager;

  const modelRef = useRef<THREE.Group | null>(null);
  const [dimensionsVisible, setDimensionsVisible] = useState(true);

  const modelUrl = sideBarManager.selectedModel?.url;
  const selectedMeshUuid = modelLoadManager.selectedMeshUuid;
  const onModelLoaded = modelLoadManager.handleModelLoaded;

  return (
    <div
      className="flex-1 h-full relative"
      style={{
        background: "radial-gradient(circle at center, #eaecf0 0%, #8c96a3 100%)",
      }}
    >
      {sideBarManager.selectedModel?.name && (
        <div className="absolute bottom-6 md:top-6 md:bottom-auto left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <h2 className="text-gray-800 font-bold text-xl md:text-2xl tracking-wide">
            {sideBarManager.selectedModel.name}
          </h2>
        </div>
      )}
      {modelUrl && isManuallyModelled(sideBarManager.selectedModel, modelUrl) && (
        <button
          type="button"
          role="switch"
          aria-checked={dimensionsVisible}
          onClick={() => setDimensionsVisible((v) => !v)}
          className="absolute top-6 right-6 z-10 flex items-center gap-2 rounded-full bg-white/90 py-1.5 pl-3 pr-1.5 text-sm font-medium text-gray-800 shadow-md backdrop-blur hover:bg-white cursor-pointer"
        >
          Dimensions
          <span
            className={`relative h-6 w-11 rounded-full transition-colors ${
              dimensionsVisible ? "bg-green-500" : "bg-gray-400"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                dimensionsVisible ? "left-[1.375rem]" : "left-0.5"
              }`}
            />
          </span>
        </button>
      )}
      <Canvas
        camera={{ position: [0, 2, 7.5], fov: 45, near: 0.1, far: 15 }}
        shadows
        gl={{
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.9,
        }}
      >
        {/* <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} /> */}

        {modelUrl && (
          <Suspense fallback={<Loader />}>
            <Env />
            <NormalizedModelGroup targetSize={3.5}>
              <LoadedModel
                key={`${modelUrl}-${sideBarManager.loadKey}`}
                url={modelUrl}
                onModelLoaded={onModelLoaded}
                modelRef={modelRef}
                selectedMeshUuid={selectedMeshUuid}
                selectedMaterial={sideBarManager.selectedMaterial}
                selectedCrimpColor={sideBarManager.selectedCrimpColor}
                currentModel={sideBarManager.selectedModel}
                dimensionsVisible={dimensionsVisible}
              />
            </NormalizedModelGroup>
          </Suspense>
        )}

        <OrbitControls
          makeDefault
          minDistance={5}
          maxDistance={10}
          enablePan={false}
        />
      </Canvas>
    </div>
  );
});
