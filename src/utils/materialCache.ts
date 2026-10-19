import * as THREE from "three";

/**
 * Shared PBR material cache keyed by normalized hexadecimal color code (e.g. "#1162A0").
 * Cloned once from the universal base material (/models/Rendering/material.glb)
 * and reused across all meshes and models to avoid redundant shader compilation.
 */
class MaterialCache {
  private cache = new Map<string, THREE.Material>();

  getOrCreateMaterial(
    colorCode: string,
    baseMaterial: THREE.Material
  ): THREE.Material {
    const key = colorCode.toUpperCase();
    const existing = this.cache.get(key);
    if (existing) {
      return existing;
    }

    const cloned = baseMaterial.clone() as
      | THREE.MeshStandardMaterial
      | THREE.MeshPhysicalMaterial;

    cloned.color = new THREE.Color(colorCode);
    cloned.needsUpdate = true;

    this.cache.set(key, cloned);
    return cloned;
  }

  has(colorCode: string): boolean {
    return this.cache.has(colorCode.toUpperCase());
  }

  clear() {
    this.cache.forEach((mat) => mat.dispose());
    this.cache.clear();
  }
}

export const sharedMaterialCache = new MaterialCache();
