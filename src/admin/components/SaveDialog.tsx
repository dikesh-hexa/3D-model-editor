import React from "react";
import { observer } from "mobx-react-lite";
import { Save, AlertTriangle, FileCheck, X } from "lucide-react";
import type { AdminManager } from "../store/AdminManager";

interface SaveDialogProps {
  adminManager: AdminManager;
}

export const SaveDialog: React.FC<SaveDialogProps> = observer(
  ({ adminManager }) => {
    if (!adminManager.isSaveDialogOpen) return null;

    const { catalogManager } = adminManager;
    const modifiedModels = catalogManager.models.filter(
      (m) => m.isNew || m.isModified
    );
    const hasUnmapped = modifiedModels.some((m) =>
      m.meshes.some((mesh) => mesh.part === "Unmapped")
    );

    const handleSave = async () => {
      const result = await adminManager.saveAllChanges();
      if (result.success) {
        alert("All changes and models successfully saved! You can reload to verify in the configurator.");
      } else {
        alert(`Error saving changes: ${result.message}`);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Save className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-800 text-sm">
                Confirm & Save Changes
              </h3>
            </div>
            <button
              onClick={() => adminManager.setSaveDialogOpen(false)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3 text-xs text-gray-700 max-h-96 overflow-y-auto">
            {hasUnmapped && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-2 text-amber-800">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
                <div>
                  <p className="font-semibold">Unmapped Meshes Found</p>
                  <p className="mt-0.5 text-[11px]">
                    Some models have meshes without assigned parts. They will fall back to each finish's default material.
                  </p>
                </div>
              </div>
            )}

            <div>
              <p className="font-semibold text-gray-800 mb-1">
                Models to be Saved / Updated ({modifiedModels.length}):
              </p>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto bg-gray-50">
                {modifiedModels.length === 0 ? (
                  <div className="p-3 text-center text-gray-400 text-xs">
                    No models modified or pending save.
                  </div>
                ) : (
                  modifiedModels.map((m) => (
                    <div
                      key={m.id}
                      className="p-2 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <FileCheck className="w-3.5 h-3.5 text-blue-500" />
                        <span className="font-mono">{m.id}</span>
                        <span className="text-[11px] text-gray-400">
                          ({m.category})
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {m.isNew ? "New GLB" : "Update Config"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <p className="text-[11px] text-gray-500">
              Saving will stream GLB files into <code className="bg-gray-100 px-1 py-0.5 rounded">public/models/ClientModel/</code> (AC/AR/PL) or <code className="bg-gray-100 px-1 py-0.5 rounded">public/models/PROBlack DR Fittings/</code> (DR) and write atomic updates to <code className="bg-gray-100 px-1 py-0.5 rounded">src/data/models.json</code> (with safety <code className="bg-gray-100 px-1 py-0.5 rounded">.bak</code> backup).
            </p>
          </div>

          {/* Footer */}
          <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end space-x-2">
            <button
              onClick={() => adminManager.setSaveDialogOpen(false)}
              className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={adminManager.isSaving}
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center space-x-1.5 transition-all"
            >
              {adminManager.isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Everything</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }
);
