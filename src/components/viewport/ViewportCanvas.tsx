import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Suspense, useRef } from "react";
import { observer } from "mobx-react-lite";
import { LoadedModel } from "./LoadedModel";
import { Loader } from "./Loader";
import { Env } from "./Env";
import { useMainContext } from "../../context/MainContext";
import { NormalizedModelGroup } from "./NormalizedModelGroup";

export const ViewportCanvas = observer(() => {
  const stateManager = useMainContext();
  const { modelLoadManager } = stateManager.design3DManager;
  const { sideBarManager } = stateManager.designManager;

  const modelRef = useRef<THREE.Group | null>(null);

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
