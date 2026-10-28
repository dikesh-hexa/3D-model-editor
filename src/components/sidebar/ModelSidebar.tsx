import { observer } from "mobx-react-lite";
import { useEffect, useRef } from "react";
import { useMainContext } from "../../context/MainContext";
import { MaterialDropdown } from "./Material";
import { CrimpDropdown } from "./CrimpDropdown";
import { CategoryDropdown } from "./CategoryDropdown";
import { ModelSearch } from "./ModelSearch";

export const ModelSidebar = observer(() => {
  const stateManager = useMainContext();
  const { sideBarManager } = stateManager.designManager;
  const { modelLoadManager } = stateManager.design3DManager;

  const hasCrimpMesh = modelLoadManager.meshes.some(mesh => mesh.name === "Crimp") && sideBarManager.selectedCategory !== "PROBlack DR Fittings";

  const {
    filteredModelFiles,
    selectedModel,
    setSelectedModel,
    isDropdownOpen,
    toggleDropdown,
    closeDropdown,
    isMaterialDropdownOpen,
    closeMaterialDropdown,
    isCrimpDropdownOpen,
    closeCrimpDropdown
  } = sideBarManager;

  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isDropdownOpen && selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [isDropdownOpen]);

  return (
    <aside
      className="w-64 bg-gray-100 border-r border-gray-300 flex-col gap-4 p-4 hidden md:flex"
      onClick={() => {
        if (isDropdownOpen) closeDropdown();
        if (isMaterialDropdownOpen) closeMaterialDropdown();
        if (isCrimpDropdownOpen) closeCrimpDropdown();
        if (stateManager.designManager.sideBarManager.isCategoryDropdownOpen) stateManager.designManager.sideBarManager.closeCategoryDropdown();
      }}
    >
      <h2 className="text-gray-800 font-semibold text-sm">
        Model Explorer
      </h2>

      <ModelSearch />

      <CategoryDropdown />

      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Select Model
        </label>

        <button
          onClick={toggleDropdown}
          className="flex items-center justify-between w-full text-left text-xs text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 py-2 px-3"
        >
          <span className="truncate">
            {selectedModel?.name || "Select a model..."}
          </span>
          <span className="text-gray-400 ml-2 text-[10px]">▼</span>
        </button>

        {isDropdownOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredModelFiles.map((model) => (
              <button
                key={model.id}
                ref={selectedModel?.id === model.id ? selectedRef : null}
                className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-blue-50 ${
                  selectedModel?.id === model.id
                    ? "bg-blue-100 font-medium text-blue-900"
                    : "text-gray-700"
                }`}
                onClick={() => setSelectedModel(model)}
              >
                {model.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <MaterialDropdown />
      {hasCrimpMesh && <CrimpDropdown />}
    </aside>
  );
});
