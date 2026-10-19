import type { RefObject } from "react";
import * as THREE from "three";

export interface MeshPartDeclaration {
  name: string;
  part: string;
}

export interface FinishPreset {
  id: string;
  name: string;
  code?: string | null;
  default: string;
  parts: Record<string, string>;
  defaultCrimp?: string;
  requiredParts?: string[];
  categories?: string[];
}

export interface PartAliasFallbackPattern {
  pattern: string;
  part: string;
  priority: number;
}

export interface PartAliasConfig {
  parts: Record<string, string[]>;
  fallbackPatterns: PartAliasFallbackPattern[];
}

export interface ColorCombination {
  id: number;
  finishId?: string;
  name: string;
  defaultCrimp?: string;
  materialMap: Record<string, string>;
}

export interface ModelFile {
  id: string;
  name: string;
  url: string;
  category?: string;
  finishIds?: string[];
  defaultFinishId?: string;
  partNumbers?: Record<string, string>;
  meshes?: MeshPartDeclaration[];
  overrides?: Record<string, Record<string, string>>;
  colorCombination?: ColorCombination[];
}

export interface CrimpColor {
  id: number;
  name: string;
  colorCode: string;
  description: string;
}

export interface MeshItem {
  uuid: string;
  name: string;
  ref: THREE.Mesh;
}

export interface LoadedModelProps {
  url: string;
  onModelLoaded: (clonedScene: THREE.Group) => void;
  modelRef: RefObject<THREE.Group | null>;
  selectedMeshUuid: string | null;
  selectedMaterial: ColorCombination | null;
  selectedCrimpColor?: CrimpColor | null;
  currentModel?: ModelFile | null;
}
