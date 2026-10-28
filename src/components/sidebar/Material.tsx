import { observer } from "mobx-react-lite";
import { useMainContext } from "../../context/MainContext";

export const MaterialDropdown = observer(() => {
  const stateManager = useMainContext();
  const { sideBarManager } = stateManager.designManager;
  
  const { 
    materials, 
    selectedMaterial, 
    setSelectedMaterial, 
    isMaterialDropdownOpen, 
    toggleMaterialDropdown 
  } = sideBarManager;

  return (
    <div 
      className="relative" 
      onClick={(e) => e.stopPropagation()}
    >
      <label className="block text-sm md:text-xs font-medium text-gray-700 mb-1">
        Material
      </label>
      
      <button
        onClick={toggleMaterialDropdown}
        className="flex items-center justify-between w-full text-left text-sm md:text-xs text-gray-800 md:text-gray-700 bg-gray-50 md:bg-white border border-gray-300 rounded-lg md:rounded-md shadow-sm focus:outline-none focus:ring-2 md:focus:ring-1 focus:ring-blue-500 py-3 px-4 md:py-2 md:px-3"
      >
        <span className="truncate">{selectedMaterial?.name || "Select a material..."}</span>
        <span className="text-gray-400 ml-2 text-xs md:text-[10px]">▼</span>
      </button>

      {isMaterialDropdownOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {materials.map((material) => (
            <button
              key={material.id}
              className={`w-full text-left px-4 py-3 md:px-3 md:py-2 text-sm md:text-xs transition-colors hover:bg-blue-50 ${
                selectedMaterial?.id === material.id ? "bg-blue-100 font-medium text-blue-900" : "text-gray-700"
              }`}
              onClick={() => setSelectedMaterial(material)}
            >
              {material.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
