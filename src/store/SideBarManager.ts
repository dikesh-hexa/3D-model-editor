import { makeAutoObservable } from "mobx";
import type { ModelFile, ColorCombination, CrimpColor, FinishPreset } from "../types/types";
import predefinedModels from "../data/models.json";
import finishPresetsData from "../data/finishPresets.json";
import { useGLTF } from "@react-three/drei";
import { getFilteredCrimpColors, getRecommendedCrimpColor } from "../utils/crimpFilterUtils";
import { buildColorCombinations, isFinishCompatible } from "../utils/finishUtils";
import crimpColorsData from "../data/crimpColors.json";

export class SideBarManager {
  modelFiles: ModelFile[] = [];
  selectedModel: ModelFile | null = null;
  loadKey: number = 0;
  isDropdownOpen: boolean = false;

  selectedCategory: string = "PROGold Fittings";
  isCategoryDropdownOpen: boolean = false;

  materials: ColorCombination[] = [];
  selectedMaterial: ColorCombination | null = null;
  isMaterialDropdownOpen: boolean = false;

  crimpColors: CrimpColor[] = [];
  selectedCrimpColor: CrimpColor | null = null;
  isCrimpDropdownOpen: boolean = false;

  approvedModels: Set<string> = new Set();
  rejectedModels: Set<string> = new Set();

  // Model id from ?model= on page load; kept until the first refresh resolves it
  pendingUrlModelId: string | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    this.pendingUrlModelId = this.getModelIdFromUrl();
    this.initModels();

    // Listen for model updates from Admin Panel / local saves
    if (typeof window !== "undefined") {
      window.addEventListener("models-updated", ((e: CustomEvent) => {
        this.refreshModels(e.detail?.category, e.detail?.id);
      }) as EventListener);

      // Async initial refresh to catch any disk updates made in admin panel
      this.refreshModels();
    }
  }

  initModels() {
    this.modelFiles = predefinedModels as ModelFile[];
    const fromUrl = this.findModelById(this.pendingUrlModelId);
    if (fromUrl) {
      if (fromUrl.category) this.selectedCategory = fromUrl.category;
      this.setSelectedModel(fromUrl);
    } else if (this.filteredModelFiles.length > 0) {
      this.setSelectedModel(this.filteredModelFiles[0]);
    }

    this.crimpColors = crimpColorsData.crimpColors as CrimpColor[];
    if (this.crimpColors.length > 0) {
      this.selectedCrimpColor = this.crimpColors[0];
    }
  }

  getModelIdFromUrl(): string | null {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("model");
  }

  findModelById(id: string | null): ModelFile | undefined {
    if (!id) return undefined;
    const exact = this.modelFiles.find((m) => m.id === id);
    if (exact) return exact;

    // Variant resolution, tried when no id matches exactly. Two rules build a pattern per model:
    //  1. Every "X" in the model name is a wildcard for one or more letters/digits
    //     ("AC-06-JX" covers AC-06-J4, "AC-08-HX-DS" covers AC-08-H4-DS).
    //  2. A variant digit in the id (a segment that is a single digit, or ends in letter+digit)
    //     is a wildcard for any number ("PL-24-60JIC-3" covers PL-24-60JIC-7, "AC-06-J3" covers J10).
    // The match with the most literal characters wins; ties go to the first model listed.
    const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let best: ModelFile | undefined;
    let bestScore = -1;
    for (const m of this.modelFiles) {
      const candidates: { pattern: string; score: number }[] = [];
      if (m.name !== m.id && /X/i.test(m.name)) {
        candidates.push({
          pattern: m.name.split(/x/i).map(esc).join("[A-Za-z0-9]+"),
          score: m.name.replace(/x/gi, "").length,
        });
      }
      let literal = 0;
      let hasVariant = false;
      const idPattern = m.id
        .split("-")
        .map((seg) => {
          const v = /^(\d|(.*[A-Za-z])\d)$/.exec(seg);
          if (!v) {
            literal += seg.length;
            return esc(seg);
          }
          hasVariant = true;
          const head = v[2] ?? "";
          literal += head.length;
          return esc(head) + "\\d+";
        })
        .join("-");
      if (hasVariant) candidates.push({ pattern: idPattern, score: literal });

      for (const c of candidates) {
        if (c.score > bestScore && new RegExp(`^${c.pattern}$`, "i").test(id)) {
          best = m;
          bestScore = c.score;
        }
      }
    }
    return best;
  }

  // Search across all categories: the variant-resolved model (same logic as ?model=) first,
  // then models whose id or name contains the query.
  searchModels(query: string, limit = 12): ModelFile[] {
    const q = query.trim();
    if (!q) return [];
    const lower = q.toLowerCase();
    const results: ModelFile[] = [];
    const resolved = this.findModelById(q);
    if (resolved) results.push(resolved);
    for (const m of this.modelFiles) {
      if (results.length >= limit) break;
      if (m === resolved) continue;
      if (m.id.toLowerCase().includes(lower) || m.name.toLowerCase().includes(lower)) {
        results.push(m);
      }
    }
    return results;
  }

  selectModelFromSearch(model: ModelFile) {
    if (model.category) this.selectedCategory = model.category;
    this.setSelectedModel(model);
  }

  syncUrl(model: ModelFile | null) {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (model) {
      url.searchParams.set("model", model.id);
    } else {
      url.searchParams.delete("model");
    }
    window.history.replaceState(null, "", url);
  }

  get categories(): string[] {
    const set = new Set<string>();
    const defaultCategories = ["PROGold Fittings", "PROBlack DR Fittings", "Smooth Bore Fittings"];

    // Preserve default ordering for standard categories if they exist
    defaultCategories.forEach((cat) => {
      if (this.modelFiles.some((m) => m.category === cat)) {
        set.add(cat);
      }
    });

    // Dynamically include all other categories found in modelFiles
    this.modelFiles.forEach((m) => {
      if (m.category && m.category.trim()) {
        set.add(m.category.trim());
      }
    });

    if (set.size === 0) {
      defaultCategories.forEach((cat) => set.add(cat));
    }

    return Array.from(set);
  }

  get categoryCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    this.modelFiles.forEach((m) => {
      const key = m.category?.trim();
      if (key) counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }

  async refreshModels(targetCategory?: string, targetModelId?: string) {
    try {
      let latestList: ModelFile[] | null = null;
      try {
        const adminRes = await fetch("/__admin/data");
        if (adminRes.ok) {
          const adminData = await adminRes.json();
          if (Array.isArray(adminData.models)) {
            latestList = adminData.models;
          }
        }
      } catch {
        // Dev endpoint unavailable
      }

      if (!latestList) {
        const jsonRes = await fetch("/src/data/models.json");
        if (jsonRes.ok) {
          latestList = await jsonRes.json();
        }
      }

      if (latestList && Array.isArray(latestList) && latestList.length > 0) {
        this.modelFiles = latestList;
      }
    } catch {
      // Ignore network errors in offline/static environments
    }

    // On the first refresh, honour ?model= from the page URL
    if (!targetModelId && this.pendingUrlModelId) {
      const fromUrl = this.findModelById(this.pendingUrlModelId);
      if (fromUrl) {
        targetModelId = fromUrl.id;
        targetCategory = fromUrl.category;
      }
    }
    this.pendingUrlModelId = null;

    // Set target category if specified, or ensure current category is valid
    if (targetCategory && this.categories.includes(targetCategory)) {
      this.selectedCategory = targetCategory;
    } else if (!this.categories.includes(this.selectedCategory)) {
      this.selectedCategory = this.categories[0] || "PROGold Fittings";
    }

    // Select targeted model if specified
    if (targetModelId) {
      const found = this.filteredModelFiles.find((m) => m.id === targetModelId);
      if (found) {
        this.setSelectedModel(found);
        return;
      }
    }

    // Ensure selectedModel belongs to the currently active category
    if (
      !this.selectedModel ||
      !this.filteredModelFiles.some((m) => m.id === this.selectedModel?.id)
    ) {
      if (this.filteredModelFiles.length > 0) {
        this.setSelectedModel(this.filteredModelFiles[0]);
      } else {
        this.setSelectedModel(null);
      }
    }
  }

  get filteredModelFiles() {
    // @ts-ignore
    return this.modelFiles.filter(m => m.category === this.selectedCategory);
  }

  setSelectedCategory(category: string) {
    this.selectedCategory = category;
    this.isCategoryDropdownOpen = false;
    
    if (this.filteredModelFiles.length > 0) {
      this.setSelectedModel(this.filteredModelFiles[0]);
    } else {
      this.setSelectedModel(null);
    }
  }

  toggleCategoryDropdown() {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
    if (this.isCategoryDropdownOpen) {
      this.isDropdownOpen = false;
      this.isMaterialDropdownOpen = false;
      this.isCrimpDropdownOpen = false;
    }
  }

  closeCategoryDropdown() {
    this.isCategoryDropdownOpen = false;
  }

  setSelectedModel(model: ModelFile | null) {
    if (model) {
      useGLTF.clear(model.url);

      // Compute materials: use colorCombination if present, or dynamically generate from finishPresets
      let mats: ColorCombination[] = model.colorCombination || [];
      if (mats.length === 0) {
        const presets = finishPresetsData as FinishPreset[];
        if (model.finishIds && model.finishIds.length > 0) {
          mats = buildColorCombinations(model, presets);
        } else {
          // Generate compatible presets so that any added model is immediately viewable and configurable
          const compatible = presets.filter(
            (p) => isFinishCompatible(model, p).compatible
          );
          const fallbackModel = {
            ...model,
            finishIds: compatible.map((p) => p.id),
          };
          mats = buildColorCombinations(fallbackModel, presets);
        }
      }

      this.materials = mats;
      if (this.materials.length > 0) {
        this.setSelectedMaterial(this.materials[0]);
      } else {
        this.setSelectedMaterial(null);
      }
    } else {
      this.materials = [];
      this.selectedMaterial = null;
    }
    this.selectedModel = model;
    this.loadKey++;
    this.isDropdownOpen = false;
    this.syncUrl(model);
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen) {
      this.isMaterialDropdownOpen = false;
      this.isCrimpDropdownOpen = false;
      this.isCategoryDropdownOpen = false;
    }
  }

  closeDropdown() {
    this.isDropdownOpen = false;
  }

  setSelectedMaterial(material: ColorCombination | null) {
    this.selectedMaterial = material;
    this.isMaterialDropdownOpen = false;

    if (material) {
      // Auto-update to recommended crimp color if available
      const recommended = this.recommendedCrimpColor;
      if (recommended) {
        this.selectedCrimpColor = recommended;
      } else if (this.selectedCrimpColor && !this.availableCrimpColors.some(c => c.id === this.selectedCrimpColor!.id)) {
        // If current crimp is no longer available in the filtered list, reset to the first available option
        this.selectedCrimpColor = this.availableCrimpColors[0] || null;
      }
    }
  }

  get availableCrimpColors() {
    return getFilteredCrimpColors(this.selectedMaterial, this.crimpColors);
  }

  get recommendedCrimpColor() {
    return getRecommendedCrimpColor(this.selectedMaterial, this.availableCrimpColors);
  }

  toggleMaterialDropdown() {
    this.isMaterialDropdownOpen = !this.isMaterialDropdownOpen;
    if (this.isMaterialDropdownOpen) {
      this.isDropdownOpen = false;
      this.isCrimpDropdownOpen = false;
      this.isCategoryDropdownOpen = false;
    }
  }

  closeMaterialDropdown() {
    this.isMaterialDropdownOpen = false;
  }

  setSelectedCrimpColor(color: CrimpColor | null) {
    this.selectedCrimpColor = color;
    this.isCrimpDropdownOpen = false;
  }

  toggleCrimpDropdown() {
    this.isCrimpDropdownOpen = !this.isCrimpDropdownOpen;
    if (this.isCrimpDropdownOpen) {
      this.isDropdownOpen = false;
      this.isMaterialDropdownOpen = false;
      this.isCategoryDropdownOpen = false;
    }
  }

  closeCrimpDropdown() {
    this.isCrimpDropdownOpen = false;
  }

  setInitialFeedbackState(approved: string[], rejected: string[]) {
    this.approvedModels = new Set(approved);
    this.rejectedModels = new Set(rejected);
  }

  approveModel(modelName: string) {
    this.approvedModels.add(modelName);
    this.rejectedModels.delete(modelName);
  }

  rejectModel(modelName: string) {
    this.rejectedModels.add(modelName);
    this.approvedModels.delete(modelName);
  }
}
