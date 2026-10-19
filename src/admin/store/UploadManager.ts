import { makeAutoObservable } from "mobx";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { groupVariants } from "../../utils/partNumberUtils";
import { resolvePart } from "../../utils/finishUtils";
import type { AdminModelItem, ModelWarning } from "./ModelCatalogManager";
import type { AdminManager } from "./AdminManager";
import type { ColorCombination } from "../../types/types";

export interface ModelRouting {
  storageFolder: string;
  category: string;
  webPath: string;
}

export function resolveModelStorageAndCategory(modelIdOrFilename: string): ModelRouting {
  const upper = modelIdOrFilename.toUpperCase().trim().replace(/\.GLB$/i, "");

  // 1. AC, AR, PL -> ClientModel (Category: PROGold Fittings)
  if (
    upper.startsWith("AC-") || upper.startsWith("AC") ||
    upper.startsWith("AR-") || upper.startsWith("AR") ||
    upper.startsWith("PL-") || upper.startsWith("PL")
  ) {
    return {
      storageFolder: "ClientModel",
      category: "PROGold Fittings",
      webPath: `/models/ClientModel/${upper}.glb`,
    };
  }

  // 2. DR -> PROBlack DR Fittings (Category: PROBlack DR Fittings)
  if (upper.startsWith("DR-") || upper.startsWith("DR")) {
    return {
      storageFolder: "PROBlack DR Fittings",
      category: "PROBlack DR Fittings",
      webPath: `/models/PROBlack DR Fittings/${upper}.glb`,
    };
  }

  // 3. SB & SBR -> SB&PROBlack Models (Category: Smooth Bore Fittings)
  if (
    upper.startsWith("SB-") || upper.startsWith("SB") ||
    upper.startsWith("SBR-") || upper.startsWith("SBR")
  ) {
    return {
      storageFolder: "SB&PROBlack Models",
      category: "Smooth Bore Fittings",
      webPath: `/models/SB&PROBlack Models/${upper}.glb`,
    };
  }

  return {
    storageFolder: "ClientModel",
    category: "Imported Models",
    webPath: `/models/ClientModel/${upper}.glb`,
  };
}

export function generateColorCombinationsForPrefix(
  modelId: string,
  meshes: { name: string; part: string }[]
): {
  colorCombination: ColorCombination[];
  finishIds: string[];
  defaultFinishId: string;
  category: string;
} {
  const upper = modelId.toUpperCase().trim();

  // Helper to build a material map mapping each mesh node to its color
  const buildMap = (
    defaultColor: string,
    overrides: Record<string, string> = {}
  ) => {
    const map: Record<string, string> = {};
    meshes.forEach((m) => {
      map[m.name] = overrides[m.name] || overrides[m.part] || defaultColor;
    });
    return map;
  };

  // AC- prefix: Blue and Black
  if (upper.startsWith("AC-") || upper.startsWith("AC")) {
    return {
      category: "PROGold Fittings",
      finishIds: ["aluminium-blue", "aluminium-black"],
      defaultFinishId: "aluminium-blue",
      colorCombination: [
        { id: 1, name: "Blue", materialMap: buildMap("Blue") },
        { id: 2, name: "Black", materialMap: buildMap("Black") },
      ],
    };
  }

  // AR- & PL- prefix: Blue Gold
  if (
    upper.startsWith("AR-") ||
    upper.startsWith("AR") ||
    upper.startsWith("PL-") ||
    upper.startsWith("PL")
  ) {
    return {
      category: "PROGold Fittings",
      finishIds: ["blue-gold"],
      defaultFinishId: "blue-gold",
      colorCombination: [
        {
          id: 1,
          name: "Blue Gold",
          materialMap: buildMap("Blue", {
            Socket: "Gold",
            "Press Lock": "Gold",
            PressLock: "Gold",
            Crimp: "Gold",
          }),
        },
      ],
    };
  }

  // SB- & SBR- prefix: Stainless Steel
  if (
    upper.startsWith("SB-") ||
    upper.startsWith("SB") ||
    upper.startsWith("SBR-") ||
    upper.startsWith("SBR")
  ) {
    return {
      category: "Smooth Bore Fittings",
      finishIds: ["stainless-steel"],
      defaultFinishId: "stainless-steel",
      colorCombination: [
        {
          id: 1,
          name: "Stainless Steel",
          materialMap: buildMap("Stainless Steel"),
        },
      ],
    };
  }

  // DR- prefix: Black
  if (upper.startsWith("DR-") || upper.startsWith("DR")) {
    return {
      category: "PROBlack DR Fittings",
      finishIds: ["aluminium-black"],
      defaultFinishId: "aluminium-black",
      colorCombination: [
        { id: 1, name: "Black", materialMap: buildMap("Black") },
      ],
    };
  }

  // Fallback for models without recognized prefix
  return {
    category: "Imported Models",
    finishIds: [],
    defaultFinishId: "",
    colorCombination: [
      { id: 1, name: "Stainless Steel", materialMap: buildMap("Stainless Steel") },
    ],
  };
}

export class UploadManager {
  isProcessing: boolean = false;
  processedCount: number = 0;
  totalCount: number = 0;
  currentFilename: string = "";
  private blobUrls: string[] = [];

  adminManager: AdminManager;

  constructor(adminManager: AdminManager) {
    this.adminManager = adminManager;
    makeAutoObservable(this, {}, { autoBind: true });
  }

  createBlobUrl(file: File): string {
    const url = URL.createObjectURL(file);
    this.blobUrls.push(url);
    return url;
  }

  cleanupBlobUrls() {
    this.blobUrls.forEach((url) => URL.revokeObjectURL(url));
    this.blobUrls = [];
  }

  async processDroppedFiles(rawFiles: { file: File; category: string }[]) {
    const glbFiles = rawFiles.filter(({ file }) =>
      file.name.toLowerCase().endsWith(".glb")
    );

    if (glbFiles.length === 0) {
      alert("No .glb files found in the dropped selection.");
      return;
    }

    this.isProcessing = true;
    this.totalCount = glbFiles.length;
    this.processedCount = 0;

    const grouped = groupVariants(glbFiles);
    const gltfLoader = new GLTFLoader();
    const newAdminModels: AdminModelItem[] = [];

    // Check against existing system models loaded from models.json
    const existingModels = this.adminManager.catalogManager.existingModels;
    const aliases = this.adminManager.aliasManager.config;

    for (const group of grouped) {
      this.currentFilename = group.primaryFile.name;
      const blobUrl = this.createBlobUrl(group.primaryFile);

      try {
        const gltf = await gltfLoader.loadAsync(blobUrl);
        const meshes: { name: string; part: string }[] = [];
        const seenNames = new Set<string>();
        const warnings: ModelWarning[] = [];

        if (!group.hasColorCode) {
          warnings.push({
            type: "no_code",
            message: "No recognized color code in filename (manual finish assignment needed)",
          });
        }

        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const meshName = child.name || "Unnamed";

            if (meshName.startsWith(" ") || meshName.endsWith(" ")) {
              warnings.push({
                type: "whitespace_name",
                message: `Mesh "${meshName}" has leading or trailing whitespace`,
              });
            }

            if (seenNames.has(meshName)) {
              warnings.push({
                type: "duplicate_mesh",
                message: `Duplicate mesh name detected: "${meshName}"`,
              });
            }
            seenNames.add(meshName);

            // Auto-assign collar part based on model ID prefix:
            // - "AR-" prefix: collar is "Socket"
            // - "PL-" prefix: collar is "Press Lock"
            // - Others: collar is "Crimp"
            const isCollarMesh =
              meshName.toLowerCase().includes("crimp") ||
              meshName.toLowerCase().includes("socket") ||
              meshName.toLowerCase().includes("press") ||
              meshName.toLowerCase().includes("collar");

            let detectedPart = resolvePart(meshName, null, aliases);

            if (isCollarMesh) {
              const upperId = group.basePartNumber.toUpperCase();
              if (upperId.startsWith("AR-") || upperId.startsWith("AR")) {
                detectedPart = "Socket";
              } else if (upperId.startsWith("PL-") || upperId.startsWith("PL")) {
                detectedPart = "Press Lock";
              } else {
                detectedPart = "Crimp";
              }
            }

            if (!detectedPart) {
              warnings.push({
                type: "unmapped_mesh",
                message: `Unmapped mesh: "${meshName}" requires part assignment`,
              });
            }

            meshes.push({
              name: meshName,
              part: detectedPart || "Unmapped",
            });
          }
        });

        // Duplicate Detection: Check if already present in models.json
        const cleanBaseId = group.basePartNumber.toLowerCase().trim();
        const existingModel = existingModels.find((m) => {
          const mId = m.id.toLowerCase().trim();
          const mName = m.name.toLowerCase().trim();
          return (
            mId === cleanBaseId ||
            mName === cleanBaseId ||
            mId.replace(/-[0-9x]+$/, "") === cleanBaseId.replace(/-[0-9x]+$/, "")
          );
        });

        const isAlreadyConfigured = Boolean(
          existingModel &&
            ((existingModel.colorCombination &&
              existingModel.colorCombination.length > 0) ||
              (existingModel.finishIds && existingModel.finishIds.length > 0))
        );

        // Resolve target folder and category based on prefix rules
        const routing = resolveModelStorageAndCategory(group.basePartNumber);
        let finishIds: string[] = [];
        let defaultFinishId = "";
        let colorCombination: ColorCombination[] = [];
        let category = routing.category;
        const targetFolder = routing.storageFolder;

        if (isAlreadyConfigured && existingModel) {
          finishIds = existingModel.finishIds ? [...existingModel.finishIds] : [];
          defaultFinishId =
            existingModel.defaultFinishId || finishIds[0] || "";
          colorCombination = existingModel.colorCombination
            ? [...existingModel.colorCombination]
            : [];
          category = existingModel.category || category;
        } else {
          // Generate colors based on prefix rule
          const generated = generateColorCombinationsForPrefix(
            group.basePartNumber,
            meshes
          );
          finishIds = generated.finishIds;
          defaultFinishId = generated.defaultFinishId;
          colorCombination = generated.colorCombination;
          category = generated.category || routing.category;
        }

        let status: AdminModelItem["status"] = "New";
        if (isAlreadyConfigured) {
          status = "Already configured";
        } else if (warnings.some((w) => w.type === "unmapped_mesh")) {
          status = "Needs Review";
        } else if (existingModel) {
          status = "Update";
        } else {
          status = "Ready";
        }

        const adminModel: AdminModelItem = {
          id: group.basePartNumber,
          name: group.basePartNumber,
          url: blobUrl,
          category,
          targetFolder,
          isNew: !existingModel,
          isModified: !isAlreadyConfigured,
          rawFile: group.primaryFile,
          meshes,
          finishIds,
          defaultFinishId,
          partNumbers: group.partNumbers,
          overrides: existingModel?.overrides ? { ...existingModel.overrides } : {},
          colorCombination,
          warnings,
          status,
        };

        newAdminModels.push(adminModel);
      } catch (err: any) {
        console.error(`Failed to parse ${group.primaryFile.name}`, err);
      }

      this.processedCount++;
    }

    // Set catalogManager models to dropped models from this folder
    this.adminManager.catalogManager.setModels(newAdminModels);
    if (newAdminModels.length > 0) {
      this.adminManager.catalogManager.selectModel(newAdminModels[0].id);
    }

    this.isProcessing = false;
  }
}
