import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { Plus, Copy, Trash2, Edit3, Check } from "lucide-react";
import type { AdminManager } from "../store/AdminManager";
import type { FinishPreset } from "../../types/types";
import materialsDataRaw from "../../data/materials.json";
import crimpColorsDataRaw from "../../data/crimpColors.json";

interface FinishPresetsPageProps {
  adminManager: AdminManager;
}

export const FinishPresetsPage: React.FC<FinishPresetsPageProps> = observer(
  ({ adminManager }) => {
    const { presetManager, aliasManager } = adminManager;
    const presets = presetManager.presets;
    const materials = materialsDataRaw.materials;
    const crimpColors = crimpColorsDataRaw.crimpColors;
    const canonicalParts = Object.keys(aliasManager.config.parts);

    const [editingPreset, setEditingPreset] = useState<FinishPreset | null>(null);

    const handleCreateNew = () => {
      const newPreset: FinishPreset = {
        id: `custom-finish-${Date.now().toString().slice(-4)}`,
        name: "New Custom Finish",
        code: null,
        default: "Stainless Steel",
        parts: {},
        defaultCrimp: "Stainless",
      };
      presetManager.addOrUpdatePreset(newPreset);
      setEditingPreset(newPreset);
    };

    const handleSaveEdit = () => {
      if (editingPreset) {
        presetManager.addOrUpdatePreset(editingPreset);
        setEditingPreset(null);
      }
    };

    return (
      <div className="flex h-full gap-4 overflow-hidden">
        {/* Preset List (5 cols) */}
        <div className="w-1/2 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-bold text-sm text-gray-800">
              Global Finish Presets ({presets.length})
            </h3>
            <button
              onClick={handleCreateNew}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Preset</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className={`p-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                  editingPreset?.id === preset.id ? "bg-blue-50/70" : ""
                }`}
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-xs text-gray-800">
                      {preset.name}
                    </span>
                    {preset.code && (
                      <span className="text-[10px] bg-gray-100 text-gray-600 font-mono px-1.5 py-0.5 rounded">
                        Code: {preset.code}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Default Material: <span className="font-medium text-gray-700">{preset.default}</span> | Crimp: <span className="font-medium text-gray-700">{preset.defaultCrimp || "None"}</span>
                  </p>
                  {Object.keys(preset.parts).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(preset.parts).map(([part, mat]) => (
                        <span
                          key={part}
                          className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded"
                        >
                          {part}: {mat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    title="Duplicate Preset"
                    onClick={() => presetManager.duplicatePreset(preset)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    title="Edit Preset"
                    onClick={() => setEditingPreset({ ...preset, parts: { ...preset.parts } })}
                    className="p-1.5 text-blue-500 hover:text-blue-700 rounded hover:bg-blue-50"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    title="Delete Preset"
                    onClick={() => {
                      if (confirm(`Delete preset "${preset.name}"?`)) {
                        presetManager.deletePreset(preset.id);
                        if (editingPreset?.id === preset.id) setEditingPreset(null);
                      }
                    }}
                    className="p-1.5 text-red-400 hover:text-red-700 rounded hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preset Editor (7 cols) */}
        <div className="w-1/2 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-bold text-sm text-gray-800">
              {editingPreset ? `Edit: ${editingPreset.name}` : "Select a Preset to Edit"}
            </h3>
          </div>

          {editingPreset ? (
            <div className="p-4 flex-1 overflow-y-auto space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Display Name</label>
                <input
                  type="text"
                  value={editingPreset.name}
                  onChange={(e) => setEditingPreset({ ...editingPreset, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Color Code (Token)</label>
                  <input
                    type="text"
                    placeholder="e.g. 3, 4, 7-3"
                    value={editingPreset.code || ""}
                    onChange={(e) => setEditingPreset({ ...editingPreset, code: e.target.value || null })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Default Material</label>
                  <select
                    value={editingPreset.default}
                    onChange={(e) => setEditingPreset({ ...editingPreset, default: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md bg-white"
                  >
                    {materials.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-1">Default Crimp Color</label>
                <select
                  value={editingPreset.defaultCrimp || ""}
                  onChange={(e) => setEditingPreset({ ...editingPreset, defaultCrimp: e.target.value })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md bg-white"
                >
                  <option value="">None</option>
                  {crimpColors.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Part Specific Overrides */}
              <div>
                <label className="block text-gray-700 font-semibold mb-1">Part-Specific Material Overrides</label>
                <div className="border border-gray-200 rounded-lg p-2 space-y-2 bg-gray-50">
                  {canonicalParts.map((part) => (
                    <div key={part} className="flex items-center justify-between">
                      <span className="font-mono text-gray-700">{part}</span>
                      <select
                        value={editingPreset.parts[part] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          const nextParts = { ...editingPreset.parts };
                          if (val) {
                            nextParts[part] = val;
                          } else {
                            delete nextParts[part];
                          }
                          setEditingPreset({ ...editingPreset, parts: nextParts });
                        }}
                        className="px-2 py-1 border border-gray-300 rounded-md bg-white text-xs w-48"
                      >
                        <option value="">(Use Default: {editingPreset.default})</option>
                        {materials.map((m) => (
                          <option key={m.id} value={m.name}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  onClick={() => setEditingPreset(null)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Update Preset</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
              Select a preset to edit or create a new one.
            </div>
          )}
        </div>
      </div>
    );
  }
);
