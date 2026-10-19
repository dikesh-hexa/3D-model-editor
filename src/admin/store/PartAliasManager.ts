import { makeAutoObservable } from "mobx";
import type { PartAliasConfig } from "../../types/types";

export class PartAliasManager {
  config: PartAliasConfig = { parts: {}, fallbackPatterns: [] };
  testInput: string = "";

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setConfig(config: PartAliasConfig) {
    this.config = {
      parts: { ...config.parts },
      fallbackPatterns: [...(config.fallbackPatterns || [])],
    };
  }

  setTestInput(input: string) {
    this.testInput = input;
  }

  addPart(partName: string) {
    const trimmed = partName.trim();
    if (trimmed && !this.config.parts[trimmed]) {
      this.config.parts[trimmed] = [trimmed.toLowerCase()];
    }
  }

  removePart(partName: string) {
    delete this.config.parts[partName];
    this.config.fallbackPatterns = this.config.fallbackPatterns.filter(
      (p) => p.part !== partName
    );
  }

  addAlias(partName: string, alias: string) {
    const trimmed = alias.trim().toLowerCase();
    if (!trimmed) return;
    const existing = this.config.parts[partName] || [];
    if (!existing.includes(trimmed)) {
      this.config.parts[partName] = [...existing, trimmed];
    }
  }

  removeAlias(partName: string, alias: string) {
    const existing = this.config.parts[partName] || [];
    this.config.parts[partName] = existing.filter((a) => a !== alias);
  }

  addFallbackPattern(pattern: string, part: string, priority: number) {
    this.config.fallbackPatterns.push({ pattern, part, priority });
    this.config.fallbackPatterns.sort((a, b) => a.priority - b.priority);
  }

  removeFallbackPattern(index: number) {
    this.config.fallbackPatterns.splice(index, 1);
  }
}
