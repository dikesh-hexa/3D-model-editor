import { makeAutoObservable } from "mobx";
import type { MeshPartDeclaration, ColorCombination } from "../../types/types";

export interface ModelWarning {
  type: "unmapped_mesh" | "incompatible_finish" | "duplicate_mesh" | "whitespace_name" | "no_code";
  message: string;
}

export interface AdminModelItem {
  id: string;
  name: string;
  url: string; // Blob URL (if newly dropped) or /models/... URL
  category: string;
  targetFolder?: string;
  isNew: boolean;
  isModified: boolean;
  rawFile?: File;
  meshes: MeshPartDeclaration[];
  finishIds: string[];
  defaultFinishId: string;
  partNumbers: Record<string, string>;
  overrides: Record<string, Record<string, string>>;
  colorCombination?: ColorCombination[];
  warnings: ModelWarning[];
  status: "New" | "Update" | "Needs Review" | "Ready" | "Saved" | "Already configured";
}

export class ModelCatalogManager {
  // Models dropped in current session
  models: AdminModelItem[] = [];
  selectedModelId: string | null = null;
  activePreviewFinishId: string | null = null;
  filterCategory: string = "All";
  filterStatus: string = "All";
  searchQuery: string = "";

  // Existing models in system (from models.json)
  existingModels: AdminModelItem[] = [];
  selectedExistingModelId: string | null = null;
  activeExistingPreviewFinishId: string | null = null;
  existingFilterCategory: string = "All";
  existingSearchQuery: string = "";

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setModels(models: AdminModelItem[]) {
    this.models = models;
    if (models.length > 0) {
      this.selectedModelId = models[0].id;
      this.activePreviewFinishId = models[0].defaultFinishId || models[0].finishIds[0] || null;
    } else {
      this.selectedModelId = null;
      this.activePreviewFinishId = null;
    }
  }

  setExistingModels(models: AdminModelItem[]) {
    this.existingModels = models;
    if (models.length > 0 && !this.selectedExistingModelId) {
      this.selectedExistingModelId = models[0].id;
      this.activeExistingPreviewFinishId = models[0].defaultFinishId || models[0].finishIds[0] || null;
    }
  }

  get selectedModel(): AdminModelItem | null {
    return this.models.find((m) => m.id === this.selectedModelId) || null;
  }

  selectModel(modelId: string | null) {
    this.selectedModelId = modelId;
    const model = this.models.find((m) => m.id === modelId);
    if (model) {
      this.activePreviewFinishId = model.defaultFinishId || model.finishIds[0] || null;
    }
  }

  setActivePreviewFinishId(finishId: string | null) {
    this.activePreviewFinishId = finishId;
  }

  setFilterCategory(category: string) {
    this.filterCategory = category;
  }

  setFilterStatus(status: string) {
    this.filterStatus = status;
  }

  setSearchQuery(query: string) {
    this.searchQuery = query;
  }

  get filteredModels(): AdminModelItem[] {
    return this.models.filter((m) => {
      const matchCat =
        this.filterCategory === "All" || m.category === this.filterCategory;
      const matchStatus =
        this.filterStatus === "All" || m.status === this.filterStatus;
      const matchSearch =
        !this.searchQuery ||
        m.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchCat && matchStatus && matchSearch;
    });
  }

  get allCategories(): string[] {
    const set = new Set<string>();
    this.models.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set);
  }

  // --- Existing Models tab methods ---
  get selectedExistingModel(): AdminModelItem | null {
    return this.existingModels.find((m) => m.id === this.selectedExistingModelId) || null;
  }

  selectExistingModel(modelId: string | null) {
    this.selectedExistingModelId = modelId;
    const model = this.existingModels.find((m) => m.id === modelId);
    if (model) {
      this.activeExistingPreviewFinishId = model.defaultFinishId || model.finishIds[0] || null;
    }
  }

  setActiveExistingPreviewFinishId(finishId: string | null) {
    this.activeExistingPreviewFinishId = finishId;
  }

  setExistingFilterCategory(category: string) {
    this.existingFilterCategory = category;
  }

  setExistingSearchQuery(query: string) {
    this.existingSearchQuery = query;
  }

  get filteredExistingModels(): AdminModelItem[] {
    return this.existingModels.filter((m) => {
      const matchCat =
        this.existingFilterCategory === "All" || m.category === this.existingFilterCategory;
      const matchSearch =
        !this.existingSearchQuery ||
        m.name.toLowerCase().includes(this.existingSearchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(this.existingSearchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }

  get allExistingCategories(): string[] {
    const set = new Set<string>();
    this.existingModels.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set);
  }

  // --- Finish & Part manipulation ---
  toggleFinish(modelId: string, finishId: string) {
    // Check in dropped models first, then existing
    let model = this.models.find((m) => m.id === modelId);
    if (!model) model = this.existingModels.find((m) => m.id === modelId);
    if (!model) return;

    if (model.finishIds.includes(finishId)) {
      model.finishIds = model.finishIds.filter((f) => f !== finishId);
      if (model.defaultFinishId === finishId) {
        model.defaultFinishId = model.finishIds[0] || "";
      }
    } else {
      model.finishIds.push(finishId);
      if (!model.defaultFinishId) {
        model.defaultFinishId = finishId;
      }
    }
    model.isModified = true;
    this.updateModelStatus(model);
  }

  setDefaultFinish(modelId: string, finishId: string) {
    let model = this.models.find((m) => m.id === modelId);
    if (!model) model = this.existingModels.find((m) => m.id === modelId);
    if (!model) return;
    model.defaultFinishId = finishId;
    model.isModified = true;
  }

  updateMeshPart(modelId: string, meshName: string, newPart: string) {
    let model = this.models.find((m) => m.id === modelId);
    if (!model) model = this.existingModels.find((m) => m.id === modelId);
    if (!model) return;
    const meshItem = model.meshes.find((m) => m.name === meshName);
    if (meshItem) {
      meshItem.part = newPart;
    } else {
      model.meshes.push({ name: meshName, part: newPart });
    }
    model.isModified = true;
    this.updateModelStatus(model);
  }

  updateOverride(
    modelId: string,
    finishId: string,
    partName: string,
    materialName: string
  ) {
    let model = this.models.find((m) => m.id === modelId);
    if (!model) model = this.existingModels.find((m) => m.id === modelId);
    if (!model) return;
    if (!model.overrides) model.overrides = {};
    if (!model.overrides[finishId]) model.overrides[finishId] = {};
    if (materialName) {
      model.overrides[finishId][partName] = materialName;
    } else {
      delete model.overrides[finishId][partName];
    }
    model.isModified = true;
  }

  updateModelStatus(model: AdminModelItem) {
    const hasUnmapped = model.meshes.some((m) => !m.part || m.part === "Unmapped");
    if (hasUnmapped) {
      model.status = "Needs Review";
    } else if (model.status === "Already configured" && !model.isModified) {
      // Keep Already configured status
      return;
    } else if (model.isNew) {
      model.status = "Ready";
    } else if (model.isModified) {
      model.status = "Update";
    }
  }
}
