import { observer } from "mobx-react-lite";
import { useMainContext } from "../../context/MainContext";

export const Header = observer(() => {
  const stateManager = useMainContext();
  const { sideBarManager } = stateManager.designManager;
  const hasModel = !!sideBarManager.selectedModel;

  return (
    <header className="h-14 bg-gray-200 border-b border-gray-300 px-4 flex items-center justify-between z-10">
      <div className="flex items-center gap-2">
        <span className="text-blue-600 font-bold text-lg">BMRS Fittings Viewer</span>
      </div>

      {hasModel && <div className="flex items-center gap-4"></div>}
    </header>
  );
});
