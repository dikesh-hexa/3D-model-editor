import { useRef, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useMainContext } from "../../context/MainContext";
import { MaterialDropdown } from "./Material";
import { CrimpDropdown } from "./CrimpDropdown";
import { FeedbackButtons } from "../viewport/FeedbackButtons";
import { CategoryDropdown } from "./CategoryDropdown";
import { ModelSearch } from "./ModelSearch";

export const MobileControls = observer(() => {
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

  const closeAllDropdowns = () => {
    if (isDropdownOpen) closeDropdown();
    if (isMaterialDropdownOpen) closeMaterialDropdown();
    if (isCrimpDropdownOpen) closeCrimpDropdown();
  };

  return (
    <div 
      className="md:hidden w-full h-[50vh] bg-white border-t border-gray-200 overflow-y-auto"
      onClick={() => {
        closeAllDropdowns();
        if (stateManager.designManager.sideBarManager.isCategoryDropdownOpen) {
          stateManager.designManager.sideBarManager.closeCategoryDropdown();
        }
      }}
    >
      <div className="p-4 flex flex-col gap-4">
        <ModelSearch />
        <CategoryDropdown />

        {/* Select Model Dropdown */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Model
          </label>
          <button
            onClick={toggleDropdown}
            className="flex items-center justify-between w-full text-left text-sm text-gray-800 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 py-3 px-4"
          >
            <span className="truncate">
              {selectedModel?.name || "Select a model..."}
            </span>
            <span className="text-gray-500 ml-2 text-xs">▼</span>
          </button>

          {isDropdownOpen && (
            <div className="absolute z-10 w-full top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-auto">
              {filteredModelFiles.map((model) => (
                <button
                  key={model.id}
                  ref={selectedModel?.id === model.id ? selectedRef : null}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-blue-50 border-b border-gray-50 last:border-0 ${
                    selectedModel?.id === model.id
                      ? "bg-blue-50 font-semibold text-blue-700"
                      : "text-gray-700"
                  }`}
                  onClick={() => {
                    setSelectedModel(model);
                    closeDropdown();
                  }}
                >
                  {model.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <MaterialDropdown />
        {hasCrimpMesh && <CrimpDropdown />}
        <div className="mt-2 pb-8">
          <FeedbackButtons />
        </div>
      </div>
    </div>
  );
});
