/**
 * Area Naming Utilities
 * 
 * Generates sequential automatic area names (Area_001, Area_002, etc.).
 * Does not attempt semantic OCR classification.
 */

export interface AreaNamingConfig {
  prefix?: string;
  padDigits?: number;
}

/**
 * Generate sequential area name with 1-based index.
 * Example: index 1 -> "Area_001", index 2 -> "Area_002"
 */
export function formatDefaultAreaName(
  index: number,
  config: AreaNamingConfig = {}
): string {
  const prefix = config.prefix ?? 'Area_';
  const padDigits = config.padDigits ?? 3;
  const numStr = String(Math.max(1, index)).padStart(padDigits, '0');
  return `${prefix}${numStr}`;
}

/**
 * Auto-assign names to a list of detected areas that do not already have a name.
 */
export function assignDefaultAreaNames<T extends { name?: string }>(
  areas: T[],
  config: AreaNamingConfig = {}
): T[] {
  return areas.map((area, idx) => {
    if (!area.name || area.name.trim() === '') {
      return {
        ...area,
        name: formatDefaultAreaName(idx + 1, config),
      };
    }
    return area;
  });
}
