import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { Plus, Trash2, TestTube2, ArrowDownUp } from "lucide-react";
import type { AdminManager } from "../store/AdminManager";
import { resolvePart } from "../../utils/finishUtils";

interface PartAliasesPageProps {
  adminManager: AdminManager;
}

export const PartAliasesPage: React.FC<PartAliasesPageProps> = observer(
  ({ adminManager }) => {
    const { aliasManager } = adminManager;
    const { config } = aliasManager;

    const [newPartName, setNewPartName] = useState("");
    const [selectedPartForAlias, setSelectedPartForAlias] = useState(
      Object.keys(config.parts)[0] || ""
    );
    const [newAliasValue, setNewAliasValue] = useState("");

    // Tester State
    const [testQuery, setTestQuery] = useState("NutHead.001");
    const resolvedTestPart = resolvePart(testQuery, null, config);

    const handleAddPart = () => {
      if (newPartName.trim()) {
        aliasManager.addPart(newPartName.trim());
        setSelectedPartForAlias(newPartName.trim());
        setNewPartName("");
      }
    };

    const handleAddAlias = () => {
      if (selectedPartForAlias && newAliasValue.trim()) {
        aliasManager.addAlias(selectedPartForAlias, newAliasValue.trim());
        setNewAliasValue("");
      }
    };

    return (
      <div className="flex h-full gap-4 overflow-hidden">
        {/* Left: Canonical Parts & Exact Aliases */}
        <div className="w-1/2 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-bold text-sm text-gray-800">
              Canonical Parts & Exact Aliases
            </h3>
          </div>

          <div className="p-3 border-b border-gray-100 bg-gray-50/50 flex space-x-2">
            <input
              type="text"
              placeholder="New canonical part (e.g. Bolt)..."
              value={newPartName}
              onChange={(e) => setNewPartName(e.target.value)}
              className="flex-1 text-xs px-2.5 py-1.5 border border-gray-300 rounded-md"
            />
            <button
              onClick={handleAddPart}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Part</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-3 space-y-3">
            {Object.entries(config.parts).map(([partName, aliases]) => (
              <div key={partName} className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-blue-900 font-mono">{partName}</span>
                  <button
                    onClick={() => aliasManager.removePart(partName)}
                    className="text-red-400 hover:text-red-600 p-1"
                    title="Remove Part"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {aliases.map((alias) => (
                    <span
                      key={alias}
                      className="inline-flex items-center text-[11px] bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded-md"
                    >
                      <span className="font-mono">{alias}</span>
                      <button
                        onClick={() => aliasManager.removeAlias(partName, alias)}
                        className="ml-1 text-gray-400 hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex space-x-1">
                  <input
                    type="text"
                    placeholder={`Add alias for ${partName}...`}
                    value={selectedPartForAlias === partName ? newAliasValue : ""}
                    onFocus={() => setSelectedPartForAlias(partName)}
                    onChange={(e) => {
                      setSelectedPartForAlias(partName);
                      setNewAliasValue(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddAlias();
                    }}
                    className="text-[11px] px-2 py-1 border border-gray-300 rounded flex-1"
                  />
                  <button
                    onClick={() => {
                      setSelectedPartForAlias(partName);
                      handleAddAlias();
                    }}
                    className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Fallback Regex Patterns & Interactive Tester */}
        <div className="w-1/2 flex flex-col space-y-4">
          {/* Priority Fallbacks */}
          <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <h3 className="font-bold text-sm text-gray-800 flex items-center space-x-1.5">
                <ArrowDownUp className="w-4 h-4 text-blue-600" />
                <span>Priority Regex Fallbacks</span>
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Evaluated only if no exact alias matches. Lower priority number matches first.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-3">
              {config.fallbackPatterns.map((pat, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[10px]">
                      {pat.priority}
                    </span>
                    <span className="text-gray-900 font-semibold">{pat.pattern}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-blue-700 font-bold">{pat.part}</span>
                  </div>
                  <button
                    onClick={() => aliasManager.removeFallbackPattern(idx)}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Tester */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm">
            <h4 className="font-bold text-xs text-blue-900 flex items-center space-x-1.5 mb-2">
              <TestTube2 className="w-4 h-4 text-blue-600" />
              <span>Interactive Part Detection Tester</span>
            </h4>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Type sample mesh name (e.g. NutHead.001, crimp_2)..."
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-blue-200 rounded-lg bg-white shadow-inner font-mono"
              />
              <div className="p-2 bg-white rounded-lg border border-blue-100 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-mono">Result:</span>
                {resolvedTestPart ? (
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {resolvedTestPart}
                  </span>
                ) : (
                  <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Unmapped
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
