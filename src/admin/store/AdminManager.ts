import { makeAutoObservable } from "mobx";
import { FinishPresetManager } from "./FinishPresetManager";
import { PartAliasManager } from "./PartAliasManager";
import { ModelCatalogManager } from "./ModelCatalogManager";
import { UploadManager, resolveModelStorageAndCategory } from "./UploadManager";
import { buildColorCombinations, isFinishCompatible } from "../../utils/finishUtils";
import type { AdminModelItem } from "./ModelCatalogManager";

export class AdminManager {
  presetManager: FinishPresetManager;
  aliasManager: PartAliasManager;
  catalogManager: ModelCatalogManager;
  uploadManager: UploadManager;

  activeTab: "models" | "presets" | "aliases" | "existing" = "models";
  isLoadingData: boolean = true;
  isSaving: boolean = false;
  isSaveDialogOpen: boolean = false;
  hasUnsavedChanges: boolean = false;

  constructor() {
    this.presetManager = new FinishPresetManager();
    this.aliasManager = new PartAliasManager();
    this.catalogManager = new ModelCatalogManager();
    this.uploadManager = new UploadManager(this);

    makeAutoObservable(this, {}, { autoBind: true });
    this.loadInitialData();
  }

  setActiveTab(tab: "models" | "presets" | "aliases" | "existing") {
    this.activeTab = tab;
  }

  setSaveDialogOpen(open: boolean) {
    this.isSaveDialogOpen = open;
  }

  async loadInitialData() {
    this.isLoadingData = true;
    try {
      const res = await fetch("/__admin/data");
      if (!res.ok) throw new Error("Failed to load admin data");
      const data = await res.json();

      if (data.presets) this.presetManager.setPresets(data.presets);
      if (data.aliases) this.aliasManager.setConfig(data.aliases);

      if (data.models) {
        const adminModels: AdminModelItem[] = data.models.map((m: any) => ({
          id: m.id,
          name: m.name,
          url: m.url,
          category: m.category || "PROGold Fittings",
          isNew: false,
          isModified: false,
          meshes: m.meshes || [],
          finishIds: m.finishIds || (m.colorCombination ? m.colorCombination.map((c: any) => c.finishId || c.name.toLowerCase().replace(/\s+/g, "-")) : []),
          defaultFinishId: m.defaultFinishId || (m.finishIds?.[0] ?? ""),
          partNumbers: m.partNumbers || {},
          overrides: m.overrides || {},
          colorCombination: m.colorCombination || [],
          warnings: [],
          status: "Saved",
        }));
        this.catalogManager.setExistingModels(adminModels);
        // Current Models Catalog tab stays empty until files are dragged & dropped!
        this.catalogManager.setModels([]);
      }
    } catch (err) {
      console.error("Admin data load error:", err);
    } finally {
      this.isLoadingData = false;
    }
  }

  async saveAllChanges(): Promise<{ success: boolean; message?: string }> {
    this.isSaving = true;

    try {
      // 1. Upload newly dropped raw GLB files sequentially
      const modelsToUpload = this.catalogManager.models.filter(
        (m) => m.rawFile && (m.isNew || m.isModified)
      );

      for (const m of modelsToUpload) {
        if (!m.rawFile) continue;
        const routing = resolveModelStorageAndCategory(m.id);
        const targetFolder = m.targetFolder || routing.storageFolder;
        const uploadUrl = `/__admin/glb?folder=${encodeURIComponent(
          targetFolder
        )}&category=${encodeURIComponent(
          m.category
        )}&file=${encodeURIComponent(m.id + ".glb")}`;

        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/octet-stream" },
          body: m.rawFile,
        });

        if (!uploadRes.ok) {
          throw new Error(`Failed to upload ${m.id}.glb`);
        }

        const uploadJson = await uploadRes.json();
        m.url = uploadJson.path; // Update from blob: URL to permanent /models/<targetFolder>/... URL
      }

      // 2. Prepare JSON payload
      const presets = this.presetManager.presets;
      const finalModels = this.catalogManager.models.map((m) => {
        let combinations = m.colorCombination;
        if (!combinations || combinations.length === 0) {
          combinations = buildColorCombinations(
            {
              id: m.id,
              name: m.name,
              url: m.url,
              category: m.category,
              finishIds: m.finishIds,
              defaultFinishId: m.defaultFinishId,
              meshes: m.meshes,
              overrides: m.overrides,
            },
            presets
          );
        }

        const cleanCombinations = (combinations || []).map((c, idx) => ({
          id: c.id || idx + 1,
          name: c.name,
          materialMap: c.materialMap || {},
        }));

        return {
          id: m.id,
          name: m.name,
          url: m.url,
          colorCombination: cleanCombinations,
          category: m.category,
        };
      });

      const savePayload = {
        models: finalModels,
        presets: this.presetManager.presets,
        aliases: this.aliasManager.config,
      };

      const saveRes = await fetch("/__admin/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savePayload),
      });

      if (!saveRes.ok) {
        throw new Error("Failed to save JSON definitions");
      }

      // Mark all models as saved
      this.catalogManager.models.forEach((m) => {
        m.isNew = false;
        m.isModified = false;
        m.status = "Saved";
      });

      this.uploadManager.cleanupBlobUrls();
      this.isSaveDialogOpen = false;

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("models-updated"));
      }

      return { success: true };
    } catch (err: any) {
      console.error("Save error:", err);
      return { success: false, message: err.message };
    } finally {
      this.isSaving = false;
    }
  }

  async saveSingleModel(model: AdminModelItem): Promise<{ success: boolean; message?: string }> {
    this.isSaving = true;

    try {
      // 1. If newly dropped rawFile exists, upload it first
      if (model.rawFile && (model.isNew || model.isModified)) {
        const routing = resolveModelStorageAndCategory(model.id);
        const targetFolder = model.targetFolder || routing.storageFolder;
        const uploadUrl = `/__admin/glb?folder=${encodeURIComponent(
          targetFolder
        )}&category=${encodeURIComponent(
          model.category
        )}&file=${encodeURIComponent(model.id + ".glb")}`;

        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: model.rawFile,
        });

        if (!uploadRes.ok) {
          throw new Error(`Failed to upload ${model.id}.glb`);
        }

        const uploadJson = await uploadRes.json();
        model.url = uploadJson.path;
      }

      // 2. Build color combinations for this specific model
      const presets = this.presetManager.presets;
      if (!model.finishIds || model.finishIds.length === 0) {
        const compatible = presets.filter(
          (p) => isFinishCompatible(model as any, p).compatible
        );
        model.finishIds = compatible.map((p) => p.id);
        if (model.finishIds.length > 0) {
          model.defaultFinishId = model.finishIds[0];
        }
      }

      let combinations = model.colorCombination;
      if (!combinations || combinations.length === 0) {
        combinations = buildColorCombinations(
          {
            id: model.id,
            name: model.name,
            url: model.url,
            category: model.category,
            finishIds: model.finishIds,
            defaultFinishId: model.defaultFinishId,
            meshes: model.meshes,
            overrides: model.overrides,
          },
          presets
        );
      }

      const cleanCombinations = (combinations || []).map((c, idx) => ({
        id: c.id || idx + 1,
        name: c.name,
        materialMap: c.materialMap || {},
      }));

      const formattedModel = {
        id: model.id,
        name: model.name,
        url: model.url,
        colorCombination: cleanCombinations,
        category: model.category,
      };

      const savePayload = {
        models: [formattedModel],
        presets: this.presetManager.presets,
        aliases: this.aliasManager.config,
      };

      const saveRes = await fetch("/__admin/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savePayload),
      });

      if (!saveRes.ok) {
        throw new Error("Failed to save model");
      }

      model.isNew = false;
      model.isModified = false;
      model.status = "Saved";

      // Also add/update in existingModels tab
      const existingIdx = this.catalogManager.existingModels.findIndex(
        (ex) => ex.id === model.id
      );
      if (existingIdx >= 0) {
        this.catalogManager.existingModels[existingIdx] = { ...model };
      } else {
        this.catalogManager.existingModels.unshift({ ...model });
      }

      // Notify configurator (SideBarManager) so newly saved model appears immediately
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("models-updated", {
            detail: { category: model.category, id: model.id },
          })
        );
      }

      return { success: true };
    } catch (err: any) {
      console.error("Save single model error:", err);
      return { success: false, message: err.message };
    } finally {
      this.isSaving = false;
    }
  }
}
