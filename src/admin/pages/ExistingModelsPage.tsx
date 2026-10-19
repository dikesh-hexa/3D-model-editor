import React from "react";
import { observer } from "mobx-react-lite";
import type { AdminManager } from "../store/AdminManager";
import { AdminPreview } from "../components/AdminPreview";
import { ModelDetailPanel } from "../components/ModelDetailPanel";

interface ExistingModelsPageProps {
  adminManager: AdminManager;
}

export const ExistingModelsPage: React.FC<ExistingModelsPageProps> = observer(
  ({ adminManager }) => {
    const { catalogManager, presetManager } = adminManager;
    const existingModels = catalogManager.filteredExistingModels;
    const selectedModel = catalogManager.selectedExistingModel;

    return (
      <div className="flex flex-col h-full space-y-3 overflow-hidden">
        {/* Top Header & Search Bar */}
        <div className="p-3 bg-white rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div>
            <h2 className="text-sm font-bold text-gray-800">
              Existing System Models ({catalogManager.existingModels.length})
            </h2>
            <p className="text-xs text-gray-500">
              Models currently registered in <code className="bg-gray-100 px-1 py-0.5 rounded">models.json</code>
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Search existing models..."
              value={catalogManager.existingSearchQuery}
              onChange={(e) => catalogManager.setExistingSearchQuery(e.target.value)}
              className="text-xs px-3 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 w-52"
            />

            <select
              value={catalogManager.existingFilterCategory}
              onChange={(e) => catalogManager.setExistingFilterCategory(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-blue-500"
            >
              <option value="All">All Categories</option>
              {catalogManager.allExistingCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3-Column Layout: Existing Model Table | Details & Finishes | 3D Live Preview */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 min-h-0">
          {/* Models Table (4 cols) */}
          <div className="md:col-span-4 h-full min-h-0 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 text-[11px] font-semibold text-gray-600 uppercase tracking-wider sticky top-0 z-10 border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3">Model ID</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Finishes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {existingModels.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-8 text-gray-400">
                        No existing models found.
                      </td>
                    </tr>
                  ) : (
                    existingModels.map((m) => {
                      const isSelected = catalogManager.selectedExistingModelId === m.id;
                      return (
                        <tr
                          key={m.id}
                          onClick={() => catalogManager.selectExistingModel(m.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-blue-50/80 font-medium text-blue-900"
                              : "hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono text-[11px] truncate max-w-[150px]">
                            {m.id}
                          </td>
                          <td className="py-2.5 px-3 truncate max-w-[130px] text-gray-500">
                            {m.category}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                              {m.finishIds.length}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Model Config Panel (4 cols) */}
          <div className="md:col-span-4 h-full min-h-0">
            {selectedModel ? (
              <ModelDetailPanel adminManager={adminManager} />
            ) : (
              <div className="flex items-center justify-center h-full bg-white border border-gray-200 rounded-xl text-gray-400 text-xs">
                Select an existing model to configure finishes.
              </div>
            )}
          </div>

          {/* 3D Live Preview (4 cols) */}
          <div className="md:col-span-4 h-full min-h-0">
            {selectedModel ? (
              <AdminPreview
                model={selectedModel}
                presets={presetManager.presets}
                activeFinishId={catalogManager.activeExistingPreviewFinishId}
                onSelectFinish={(fid) =>
                  catalogManager.setActiveExistingPreviewFinishId(fid)
                }
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-50 border border-gray-200 rounded-xl text-gray-400 text-xs">
                Select an existing model to view live 3D preview.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
