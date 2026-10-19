import type { CrimpColor, ColorCombination } from "../types/types";

export function getFilteredCrimpColors(
  selectedMaterial: ColorCombination | null,
  allCrimpColors: CrimpColor[]
): CrimpColor[] {
  if (!selectedMaterial) return allCrimpColors;

  const materialName = selectedMaterial.name;
  const isStainlessMaterial = [
    "Stainless Steel",
    "Stainless Steel w/t Aluminium Blue Nut",
    "Stainless Steel w/t Aluminium Black Nut",
    "Stainless Steel w/ Aluminium Blue Nut",
    "Stainless Steel w/ Aluminium Black Nut",
    "Stainless Steel Elbow w/Aluminum Nut & Insert (Blue)",
    "Stainless Steel Elbow w/Aluminum Nut & Insert (Black)",
  ].some((name) => materialName.toLowerCase().includes(name.toLowerCase()));

  return allCrimpColors.filter((crimp) => {
    if (isStainlessMaterial) {
      return crimp.name === "Stainless";
    } else {
      return crimp.name !== "Stainless";
    }
  });
}

export function getRecommendedCrimpColor(
  selectedMaterial: ColorCombination | null,
  availableCrimpColors: CrimpColor[]
): CrimpColor | null {
  if (!selectedMaterial) return null;

  // 1. If preset defines defaultCrimp, prioritize it
  if (selectedMaterial.defaultCrimp) {
    const matched = availableCrimpColors.find(
      (c) =>
        c.name.toLowerCase() === selectedMaterial.defaultCrimp?.toLowerCase()
    );
    if (matched) return matched;
  }

  // 2. Fallback to legacy string heuristics
  const materialName = selectedMaterial.name;

  if (materialName.includes("Blue")) {
    return availableCrimpColors.find((c) => c.name === "Gold") || null;
  }
  if (materialName.includes("Black")) {
    return availableCrimpColors.find((c) => c.name === "Black") || null;
  }

  return null;
}
