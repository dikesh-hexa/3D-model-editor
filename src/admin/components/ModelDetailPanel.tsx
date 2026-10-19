import React from "react";
import { observer } from "mobx-react-lite";
import { AlertCircle, Star, Plus, Check, Save, CheckCircle2 } from "lucide-react";
import type { AdminManager } from "../store/AdminManager";
import { isFinishCompatible } from "../../utils/finishUtils";

interface ModelDetailPanelProps {
  adminManager: AdminManager;
}

export const ModelDetailPanel: React.FC<ModelDetailPanelProps> = observer(
  ({ adminManager }) => {
    const { catalogManager, presetManager, aliasManager } = adminManager;
    const model = catalogManager.selectedModel;
    const presets = presetManager.presets;
    const canonicalParts = Object.keys(aliasManager.config.parts);

    if (!model) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400 text-xs">
          Select a model to view configuration.
        </div>
      );
    }

    const assignedCount = model.colorCombination?.length || model.finishIds.length;
    const assignedPresets = presets.filter((p) => model.finishIds.includes(p.id));

    const handleSaveThisModel = async () => {
      const result = await adminManager.saveSingleModel(model);
      if (result.success) {
        alert(`Model "${model.name}" saved successfully and registered into configurator!`);
      } else {
        alert(`Error saving model: ${result.message}`);
      }
    };

    return (
      <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Header with Save Button for THIS Model */}
        <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-800">{model.name}</h3>
            <span className="text-[11px] font-mono text-gray-500">
              {model.category}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
              {assignedCount} configured
            </span>

            {/* Individual Save Button */}
            <button
              disabled={adminManager.isSaving}
              onClick={handleSaveThisModel}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1 shadow-xs transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Model</span>
            </button>
          </div>
        </div>

        {/* Already Configured Notice */}
        {model.status === "Already configured" && (
          <div className="mx-3 mt-3 flex items-start text-[11px] text-indigo-900 bg-indigo-50/90 border border-indigo-200 rounded-lg p-2.5 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-indigo-950">Already Configured in Catalog</p>
              <p className="text-indigo-800 text-[10px]">
                This model is already registered in <code className="bg-indigo-100 px-1 py-0.2 rounded font-mono">models.json</code>. Its existing color combinations and mesh mappings have been preserved.
              </p>
            </div>
          </div>
        )}

        {/* Warnings list */}
        {model.warnings.length > 0 && (
          <div className="px-3 pt-2 space-y-1">
            {model.warnings.map((w, idx) => (
              <div
                key={idx}
                className="flex items-center text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200"
              >
                <AlertCircle className="w-3 h-3 mr-1.5 flex-shrink-0" />
                <span>{w.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Content Sections */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
          {/* WIDE OPEN CONFIGURED COLORS SUMMARY */}
          <div className="p-3.5 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs text-blue-900 flex items-center">
                <Check className="w-3.5 h-3.5 text-blue-600 mr-1" />
                Configured Finishes Summary ({assignedCount})
              </span>
              <span className="text-[10px] text-gray-500">
                These colors will be available in configurator
              </span>
            </div>

            {assignedPresets.length === 0 ? (
              <div className="text-[11px] text-gray-500 bg-white/80 border border-dashed border-gray-300 rounded-lg p-2.5 text-center">
                No colors configured yet. Click <strong>"+ Add"</strong> below to add finishes to this model.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {assignedPresets.map((preset) => (
                  <span
                    key={preset.id}
                    onClick={() => catalogManager.setActivePreviewFinishId(preset.id)}
                    className="inline-flex items-center space-x-1.5 bg-white border border-blue-200 text-blue-950 font-medium px-2.5 py-1 rounded-md shadow-2xs cursor-pointer hover:border-blue-400"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        preset.default === "Blue"
                          ? "bg-blue-600"
                          : preset.default === "Black"
                          ? "bg-neutral-800"
                          : preset.default === "Stainless Steel"
                          ? "bg-slate-300"
                          : preset.default === "Gold"
                          ? "bg-amber-400"
                          : preset.default === "Plated Steel"
                          ? "bg-yellow-700"
                          : "bg-gray-400"
                      }`}
                    />
                    <span className="text-xs">{preset.name}</span>
                    {model.defaultFinishId === preset.id && (
                      <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Color Options & Finishes list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-700">
                Available Colors & Finishes
              </h4>
              <span className="text-[11px] text-gray-400">
                Click any color to preview on model
              </span>
            </div>

            <div className="space-y-1.5 border border-gray-100 rounded-lg p-2 bg-gray-50/50">
              {presets.map((preset) => {
                const isAdded = model.finishIds.includes(preset.id);
                const isPreviewing =
                  catalogManager.activePreviewFinishId === preset.id;
                const isDefault = model.defaultFinishId === preset.id;
                const { compatible, reason } = isFinishCompatible(
                  model as any,
                  preset
                );

                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      catalogManager.setActivePreviewFinishId(preset.id);
                      if (!isAdded) {
                        catalogManager.toggleFinish(model.id, preset.id);
                      }
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                      isPreviewing
                        ? "bg-blue-100/90 border-blue-400 text-blue-950 font-semibold shadow-xs"
                        : isAdded
                        ? "bg-blue-50/50 border-blue-200 text-gray-800 hover:bg-blue-50"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    } ${!compatible ? "opacity-75" : ""}`}
                  >
                    <div className="flex items-center space-x-2 flex-1">
                      <span
                        className={`w-2.5 h-2.5 rounded-full border border-gray-300 ${
                          preset.default === "Blue"
                            ? "bg-blue-600"
                            : preset.default === "Black"
                            ? "bg-neutral-800"
                            : preset.default === "Stainless Steel"
                            ? "bg-slate-300"
                            : preset.default === "Gold"
                            ? "bg-amber-400"
                            : preset.default === "Plated Steel"
                            ? "bg-yellow-700"
                            : "bg-gray-400"
                        }`}
                      />
                      <span className="text-xs">{preset.name}</span>
                      {preset.code && (
                        <span className="text-[10px] text-gray-400 font-mono">
                          [-{preset.code}]
                        </span>
                      )}
                    </div>

                    <div
                      className="flex items-center space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!compatible && (
                        <span className="text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                          {reason}
                        </span>
                      )}

                      <button
                        onClick={() =>
                          catalogManager.toggleFinish(model.id, preset.id)
                        }
                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors flex items-center space-x-1 ${
                          isAdded
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-gray-100 text-gray-700 hover:bg-blue-600 hover:text-white"
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </>
                        )}
                      </button>

                      {isAdded && (
                        <button
                          title={isDefault ? "Default Finish" : "Set as Default"}
                          onClick={() =>
                            catalogManager.setDefaultFinish(model.id, preset.id)
                          }
                          className={`p-1 rounded hover:bg-gray-100 ${
                            isDefault
                              ? "text-amber-500 font-bold"
                              : "text-gray-300 hover:text-amber-400"
                          }`}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              isDefault ? "fill-amber-400" : ""
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sub-mesh Part Detection Table */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">
              Detected Sub-Meshes & Parts
            </h4>
            <table className="w-full text-left border-collapse border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 text-[11px] font-semibold text-gray-600">
                <tr>
                  <th className="py-1.5 px-2">GLTF Mesh Node</th>
                  <th className="py-1.5 px-2">Assigned Part</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs bg-white">
                {model.meshes.map((mesh) => (
                  <tr key={mesh.name}>
                    <td className="py-1.5 px-2 font-mono text-[11px] text-gray-700">
                      {mesh.name}
                    </td>
                    <td className="py-1.5 px-2">
                      <select
                        value={mesh.part}
                        onChange={(e) =>
                          catalogManager.updateMeshPart(
                            model.id,
                            mesh.name,
                            e.target.value
                          )
                        }
                        className={`text-xs px-2 py-1 rounded border ${
                          mesh.part === "Unmapped"
                            ? "border-amber-400 bg-amber-50 text-amber-800 font-medium"
                            : "border-gray-300 bg-white text-gray-800"
                        } focus:ring-1 focus:ring-blue-500`}
                      >
                        <option value="Unmapped">-- Unmapped --</option>
                        {canonicalParts.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
);
