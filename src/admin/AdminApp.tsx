import React, { useMemo } from "react";
import { observer } from "mobx-react-lite";
import { AdminManager } from "./store/AdminManager";
import { ModelsPage } from "./pages/ModelsPage";
import { FinishPresetsPage } from "./pages/FinishPresetsPage";
import { PartAliasesPage } from "./pages/PartAliasesPage";
import { ExistingModelsPage } from "./pages/ExistingModelsPage";
import { SaveDialog } from "./components/SaveDialog";
import { Layers, Palette, Network, Database, Save, ArrowLeft } from "lucide-react";
import { MainProvider } from "../context/MainContext";

export const AdminApp: React.FC = observer(() => {
  const adminManager = useMemo(() => new AdminManager(), []);

  return (
    <MainProvider>
      <div className="flex flex-col h-screen w-screen bg-gray-100 overflow-hidden font-sans text-gray-800">
      {/* Admin Top Navigation */}
      <header className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="bg-blue-600 text-white font-extrabold text-xs px-2 py-1 rounded tracking-wider">
              ADMIN
            </span>
            <h1 className="font-bold text-sm text-gray-900">
              Finish Mapping & Model Ingestion
            </h1>
          </div>

          <nav className="flex space-x-1">
            <button
              onClick={() => adminManager.setActiveTab("models")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                adminManager.activeTab === "models"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Dropped Models</span>
              {adminManager.catalogManager.models.length > 0 && (
                <span className="ml-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                  {adminManager.catalogManager.models.length}
                </span>
              )}
            </button>

            <button
              onClick={() => adminManager.setActiveTab("presets")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                adminManager.activeTab === "presets"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Finish Presets</span>
            </button>

            <button
              onClick={() => adminManager.setActiveTab("aliases")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                adminManager.activeTab === "aliases"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Part Aliases</span>
            </button>

            <button
              onClick={() => adminManager.setActiveTab("existing")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                adminManager.activeTab === "existing"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Existing Models</span>
              <span className="ml-1 bg-gray-200 text-gray-700 text-[10px] px-1.5 py-0.2 rounded-full">
                {adminManager.catalogManager.existingModels.length}
              </span>
            </button>
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              window.location.pathname = "/";
            }}
            className="text-xs text-gray-500 hover:text-gray-800 flex items-center space-x-1 px-2.5 py-1.5 rounded hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Configurator View</span>
          </button>

          <button
            onClick={() => adminManager.setSaveDialogOpen(true)}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Changes</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-4 overflow-hidden">
        {adminManager.isLoadingData ? (
          <div className="flex flex-col items-center justify-center h-full space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <p className="text-xs text-gray-500">Loading catalog and presets...</p>
          </div>
        ) : (
          <>
            {adminManager.activeTab === "models" && (
              <ModelsPage adminManager={adminManager} />
            )}
            {adminManager.activeTab === "presets" && (
              <FinishPresetsPage adminManager={adminManager} />
            )}
            {adminManager.activeTab === "aliases" && (
              <PartAliasesPage adminManager={adminManager} />
            )}
            {adminManager.activeTab === "existing" && (
              <ExistingModelsPage adminManager={adminManager} />
            )}
          </>
        )}
      </main>

      {/* Save Confirmation Dialog */}
      <SaveDialog adminManager={adminManager} />
    </div>
    </MainProvider>
  );
});

export default AdminApp;
