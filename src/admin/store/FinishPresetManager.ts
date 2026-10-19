import { makeAutoObservable } from "mobx";
import type { FinishPreset } from "../../types/types";

export class FinishPresetManager {
  presets: FinishPreset[] = [];
  selectedPreset: FinishPreset | null = null;
  isEditing: boolean = false;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setPresets(presets: FinishPreset[]) {
    this.presets = presets;
  }

  selectPreset(preset: FinishPreset | null) {
    this.selectedPreset = preset;
    this.isEditing = false;
  }

  setIsEditing(isEditing: boolean) {
    this.isEditing = isEditing;
  }

  addOrUpdatePreset(preset: FinishPreset) {
    const idx = this.presets.findIndex((p) => p.id === preset.id);
    if (idx >= 0) {
      this.presets[idx] = preset;
    } else {
      this.presets.push(preset);
    }
    this.selectedPreset = preset;
    this.isEditing = false;
  }

  duplicatePreset(preset: FinishPreset) {
    const newId = `${preset.id}-copy-${Date.now().toString().slice(-4)}`;
    const duplicated: FinishPreset = {
      ...preset,
      id: newId,
      name: `${preset.name} (Copy)`,
      code: preset.code ? `${preset.code}-copy` : null,
    };
    this.presets.push(duplicated);
    this.selectedPreset = duplicated;
  }

  deletePreset(presetId: string) {
    this.presets = this.presets.filter((p) => p.id !== presetId);
    if (this.selectedPreset?.id === presetId) {
      this.selectedPreset = null;
      this.isEditing = false;
    }
  }
}
