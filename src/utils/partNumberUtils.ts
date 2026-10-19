/**
 * Color codes supported by convention:
 * 7-3: SS w/ Blue Nut
 * 7-4: SS w/ Black Nut
 * 3:   Blue
 * 4:   Black
 * 7:   Stainless Steel
 *
 * Ordered by length descending so multi-digit codes (e.g. "7-3") match before single-digit codes ("7" or "3").
 */
export const KNOWN_COLOR_CODES = [
  { code: "7-3", finishId: "ss-blue-nut" },
  { code: "7-4", finishId: "ss-black-nut" },
  { code: "3", finishId: "aluminium-blue" },
  { code: "4", finishId: "aluminium-black" },
  { code: "7", finishId: "stainless-steel" },
] as const;

export interface ParsedCodeResult {
  code: string;
  finishId: string;
  basePartNumber: string;
}

/**
 * Parses color code tokens appearing between separators (-, _, space) or at string ends.
 * Longest match first prevents "-7-3" from being misidentified as "-3".
 * Replaces the token with 'X' to derive the base part number (e.g. AC-06-0017-3 -> AC-06-0017-X).
 */
export function parseColorCode(filenameOrId: string): ParsedCodeResult | null {
  // Strip extension if present
  const cleanName = filenameOrId.replace(/\.[^/.]+$/, "").trim();

  for (const item of KNOWN_COLOR_CODES) {
    // Match isolated by start/end or delimiters (-, _, space, .)
    const escaped = item.code.replace("-", "\\-");
    const pattern = new RegExp(`(^|[\\-_\\s.])(${escaped})($|[\\-_\\s.])`, "i");
    const match = cleanName.match(pattern);

    if (match) {
      // Replace only the matched segment with 'X'
      const prefix = match[1] ?? "";
      const suffix = match[3] ?? "";
      const basePartNumber = cleanName.replace(
        pattern,
        `${prefix}X${suffix}`
      );

      return {
        code: item.code,
        finishId: item.finishId,
        basePartNumber,
      };
    }
  }

  return null;
}

export interface GroupedVariant {
  basePartNumber: string;
  category: string;
  primaryFile: File;
  allFiles: File[];
  detectedFinishIds: string[];
  partNumbers: Record<string, string>;
  hasColorCode: boolean;
}

/**
 * Groups a collection of dropped files into base part numbers.
 */
export function groupVariants(
  files: { file: File; category: string }[]
): GroupedVariant[] {
  const groups = new Map<string, GroupedVariant>();

  for (const { file, category } of files) {
    const rawId = file.name.replace(/\.[^/.]+$/, "").trim();
    const parsed = parseColorCode(rawId);

    if (parsed) {
      const key = `${category}::${parsed.basePartNumber}`;
      if (!groups.has(key)) {
        groups.set(key, {
          basePartNumber: parsed.basePartNumber,
          category,
          primaryFile: file,
          allFiles: [file],
          detectedFinishIds: [parsed.finishId],
          partNumbers: { [parsed.finishId]: rawId },
          hasColorCode: true,
        });
      } else {
        const existing = groups.get(key)!;
        existing.allFiles.push(file);
        if (!existing.detectedFinishIds.includes(parsed.finishId)) {
          existing.detectedFinishIds.push(parsed.finishId);
        }
        existing.partNumbers[parsed.finishId] = rawId;
      }
    } else {
      // No recognized color code
      const key = `${category}::${rawId}`;
      groups.set(key, {
        basePartNumber: rawId,
        category,
        primaryFile: file,
        allFiles: [file],
        detectedFinishIds: [],
        partNumbers: {},
        hasColorCode: false,
      });
    }
  }

  return Array.from(groups.values());
}
