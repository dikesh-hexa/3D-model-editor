import type {
  ModelFile,
  FinishPreset,
  PartAliasConfig,
  ColorCombination,
} from "../types/types";

/**
 * Normalizes mesh name by trimming, stripping trailing numbers/suffixes (.001, _2, -01), and lowercasing.
 * Examples:
 * "Nut.001" -> "nut"
 * "NutHead_2" -> "nuthead"
 * "crimp-01" -> "crimp"
 */
export function normalizeMeshName(name: string): string {
  return name.trim().replace(/([._-]?\d+)$/, "").toLowerCase();
}

/**
 * Resolves the canonical part name for a given mesh node.
 * Evaluation Order:
 * 1. Model's explicit mesh-to-part declaration (if present)
 * 2. Exact match against aliases in PartAliasConfig (e.g. 'nuthead' matches NutHead before prefix match)
 * 3. Fallback regex patterns ordered by priority (lower number = higher priority)
 */
export function resolvePart(
  meshName: string,
  model?: ModelFile | null,
  aliases?: PartAliasConfig | null
): string | null {
  if (model?.meshes) {
    const declared = model.meshes.find((m) => m.name === meshName)?.part;
    if (declared) return declared;
  }

  if (!aliases) return null;

  const key = normalizeMeshName(meshName);

  // Exact match first
  for (const [part, names] of Object.entries(aliases.parts)) {
    if (names.some((alias) => alias.toLowerCase() === key)) {
      return part;
    }
  }

  // Priority-ordered regex fallback
  const sortedPatterns = [...(aliases.fallbackPatterns || [])].sort(
    (a, b) => a.priority - b.priority
  );

  for (const rule of sortedPatterns) {
    try {
      const regex = new RegExp(rule.pattern, "i");
      if (regex.test(key)) {
        return rule.part;
      }
    } catch {
      // Ignore invalid regex syntax
    }
  }

  return null;
}

/**
 * Checks whether a finish preset is compatible with a model based on category and required parts.
 */
export function isFinishCompatible(
  model: ModelFile,
  finish: FinishPreset
): { compatible: boolean; reason?: string } {
  if (finish.categories && finish.categories.length > 0 && model.category) {
    if (!finish.categories.includes(model.category)) {
      return {
        compatible: false,
        reason: `Restricted to category: ${finish.categories.join(", ")}`,
      };
    }
  }

  const modelParts = new Set((model.meshes || []).map((m) => m.part));
  const missingParts = (finish.requiredParts || []).filter(
    (p) => !modelParts.has(p)
  );

  if (missingParts.length > 0) {
    return {
      compatible: false,
      reason: `Requires part: ${missingParts.join(", ")}`,
    };
  }

  return { compatible: true };
}

/**
 * Builds the materialMap for a specific finish preset applied to a model.
 * Hierarchy for each mesh:
 * 1. Per-model override for that finish and part
 * 2. finish.parts[part]
 * 3. finish.default
 */
export function buildMaterialMap(
  model: ModelFile,
  finish: FinishPreset
): Record<string, string> {
  const map: Record<string, string> = {};
  const meshes = model.meshes || [];

  for (const mesh of meshes) {
    const override = model.overrides?.[finish.id]?.[mesh.part];
    const finishPartMat = finish.parts?.[mesh.part];
    map[mesh.name] = override ?? finishPartMat ?? finish.default;
  }

  return map;
}

/**
 * Builds the backward-compatible colorCombination array for a model.
 */
export function buildColorCombinations(
  model: ModelFile,
  presets: FinishPreset[]
): ColorCombination[] {
  const finishIds = model.finishIds || [];
  const results: ColorCombination[] = [];

  finishIds.forEach((fid, i) => {
    const finish = presets.find((p) => p.id === fid);
    if (finish) {
      results.push({
        id: i + 1,
        finishId: finish.id,
        name: finish.name,
        defaultCrimp: finish.defaultCrimp,
        materialMap: buildMaterialMap(model, finish),
      });
    }
  });

  return results;
}
