import React, { useRef } from "react";
import { observer } from "mobx-react-lite";
import { FolderUp } from "lucide-react";
import type { AdminManager } from "../store/AdminManager";
import { resolveModelStorageAndCategory } from "../store/UploadManager";

interface FolderDropZoneProps {
  adminManager: AdminManager;
}

export const FolderDropZone: React.FC<FolderDropZoneProps> = observer(
  ({ adminManager }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { uploadManager } = adminManager;

    // Recursive traversal using webkitGetAsEntry
    const scanEntry = async (
      entry: any,
      pathPrefix: string = ""
    ): Promise<{ file: File; category: string }[]> => {
      const results: { file: File; category: string }[] = [];

      if (entry.isFile) {
        const file = await new Promise<File>((resolve) => entry.file(resolve));
        if (file.name.toLowerCase().endsWith(".glb")) {
          const routing = resolveModelStorageAndCategory(file.name);
          results.push({ file, category: routing.category });
        }
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const readEntries = async (): Promise<any[]> => {
          return new Promise((resolve) => {
            dirReader.readEntries((entries: any[]) => resolve(entries));
          });
        };

        let batch: any[];
        do {
          batch = await readEntries();
          for (const childEntry of batch) {
            const childResults = await scanEntry(
              childEntry,
              pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name
            );
            results.push(...childResults);
          }
        } while (batch.length > 0);
      }

      return results;
    };

    const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const items = e.dataTransfer.items;
      if (!items || items.length === 0) return;

      const collectedFiles: { file: File; category: string }[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
          if (entry) {
            const entries = await scanEntry(entry);
            collectedFiles.push(...entries);
          } else {
            const file = item.getAsFile();
            if (file && file.name.toLowerCase().endsWith(".glb")) {
              collectedFiles.push({ file, category: "Imported Models" });
            }
          }
        }
      }

      if (collectedFiles.length > 0) {
        uploadManager.processDroppedFiles(collectedFiles);
      }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList || fileList.length === 0) return;

      const collectedFiles: { file: File; category: string }[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (file.name.toLowerCase().endsWith(".glb")) {
          const routing = resolveModelStorageAndCategory(file.name);
          collectedFiles.push({ file, category: routing.category });
        }
      }

      if (collectedFiles.length > 0) {
        uploadManager.processDroppedFiles(collectedFiles);
      }
    };

    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={handleDrop}
        className="border border-dashed border-blue-400/80 hover:border-blue-600 bg-blue-50/50 hover:bg-blue-100/60 rounded-lg py-2 px-4 flex items-center justify-between transition-all cursor-pointer shadow-xs"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />

        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
            {uploadManager.isProcessing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            ) : (
              <FolderUp className="w-4 h-4" />
            )}
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-800">
              {uploadManager.isProcessing
                ? `Scanning: ${uploadManager.currentFilename} (${uploadManager.processedCount}/${uploadManager.totalCount})`
                : "Drop folder of .glb models here, or click to browse"}
            </span>
            <span className="text-[11px] text-gray-500 ml-2 hidden sm:inline">
              (Auto-routes AC/AR/PL → ClientModel, DR → PROBlack DR Fittings)
            </span>
          </div>
        </div>

        <button
          type="button"
          className="text-xs bg-white border border-gray-300 text-gray-700 hover:text-blue-600 hover:border-blue-400 font-medium px-2.5 py-1 rounded shadow-2xs"
        >
          Select Folder
        </button>
      </div>
    );
  }
);
