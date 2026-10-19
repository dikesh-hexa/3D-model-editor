import React from "react";
import { observer } from "mobx-react-lite";
import type { AdminManager } from "../store/AdminManager";
import { FolderDropZone } from "../components/FolderDropZone";
import { ModelTable } from "../components/ModelTable";
import { ModelDetailPanel } from "../components/ModelDetailPanel";
import { AdminPreview } from "../components/AdminPreview";

interface ModelsPageProps {
  adminManager: AdminManager;
}

export const ModelsPage: React.FC<ModelsPageProps> = observer(
  ({ adminManager }) => {
    const { catalogManager, presetManager } = adminManager;
    const selectedModel = catalogManager.selectedModel;

    return (
      <div className="flex flex-col h-full space-y-3 overflow-hidden">
        {/* Top Drop Zone */}
        <FolderDropZone adminManager={adminManager} />

        {/* 3-Column Layout: Catalog Table | Detail Config | 3D Live Preview */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 min-h-0">
          {/* Models Table (4 cols) */}
          <div className="md:col-span-4 h-full min-h-0">
            <ModelTable adminManager={adminManager} />
          </div>

          {/* Model Config Panel (4 cols) */}
          <div className="md:col-span-4 h-full min-h-0">
            <ModelDetailPanel adminManager={adminManager} />
          </div>

          {/* Live Preview (4 cols) */}
          <div className="md:col-span-4 h-full min-h-0">
            {selectedModel ? (
              <AdminPreview
                model={selectedModel}
                presets={presetManager.presets}
                activeFinishId={catalogManager.activePreviewFinishId}
                onSelectFinish={(fid) =>
                  catalogManager.setActivePreviewFinishId(fid)
                }
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-50 border border-gray-200 rounded-xl text-gray-400 text-xs">
                Select a model to view live 3D preview.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
