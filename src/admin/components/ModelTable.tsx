import React from "react";
import { observer } from "mobx-react-lite";
import { CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import type { AdminManager } from "../store/AdminManager";
import type { AdminModelItem } from "../store/ModelCatalogManager";

interface ModelTableProps {
  adminManager: AdminManager;
}

export const ModelTable: React.FC<ModelTableProps> = observer(
  ({ adminManager }) => {
    const { catalogManager } = adminManager;
    const models = catalogManager.filteredModels;

    const getStatusBadge = (status: AdminModelItem["status"]) => {
      switch (status) {
        case "Already configured":
          return (
            <span className="inline-flex items-center text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              <CheckCircle2 className="w-3 h-3 mr-1 text-indigo-600" /> Already configured
            </span>
          );
        case "Ready":
          return (
            <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Ready
            </span>
          );
        case "Needs Review":
          return (
            <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              <AlertTriangle className="w-3 h-3 mr-1" /> Review
            </span>
          );
        case "Update":
          return (
            <span className="inline-flex items-center text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              <RefreshCw className="w-3 h-3 mr-1" /> Update
            </span>
          );
        case "New":
          return (
            <span className="inline-flex items-center text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              New
            </span>
          );
        case "Saved":
        default:
          return (
            <span className="inline-flex items-center text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
              Saved
            </span>
          );
      }
    };

    return (
      <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Table Filters Header */}
        <div className="p-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
          <input
            type="text"
            placeholder="Search by ID or Name..."
            value={catalogManager.searchQuery}
            onChange={(e) => catalogManager.setSearchQuery(e.target.value)}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
          />

          <div className="flex items-center space-x-2">
            <select
              value={catalogManager.filterCategory}
              onChange={(e) => catalogManager.setFilterCategory(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="All">All Categories</option>
              {catalogManager.allCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={catalogManager.filterStatus}
              onChange={(e) => catalogManager.setFilterStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="All">All Statuses</option>
              <option value="Already configured">Already configured</option>
              <option value="Ready">Ready</option>
              <option value="Needs Review">Needs Review</option>
              <option value="New">New</option>
              <option value="Update">Update</option>
              <option value="Saved">Saved</option>
            </select>
          </div>
        </div>

        {/* Scrollable Rows */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 text-[11px] font-semibold text-gray-600 uppercase tracking-wider sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-3">Base Model ID</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-center">Meshes</th>
                <th className="py-2.5 px-3 text-center">Finishes</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {models.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    No models found matching criteria.
                  </td>
                </tr>
              ) : (
                models.map((m) => {
                  const isSelected = catalogManager.selectedModelId === m.id;
                  return (
                    <tr
                      key={m.id}
                      onClick={() => catalogManager.selectModel(m.id)}
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
                      <td className="py-2.5 px-3 text-center text-gray-500">
                        {m.meshes.length}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                          {m.colorCombination?.length || m.finishIds.length}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {getStatusBadge(m.status)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
);
