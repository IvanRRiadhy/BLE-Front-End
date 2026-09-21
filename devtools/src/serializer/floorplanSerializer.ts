import { DetectedArea, AreaPoint } from '../types/detection.js';
import {
  ProductionAreaJson,
  ProductionAreaShapePoint,
  PRODUCTION_DEFAULTS,
} from '../types/production.js';
import { calculateBothTextBoxes, TextBoxCalculationOptions } from '../calculator/textBoxCalculator.js';
import { formatDefaultAreaName } from '../naming/areaNaming.js';

export interface FloorplanSerializerOptions extends TextBoxCalculationOptions {
  /**
   * Optional floorplan ID (if known in context). Defaults to empty string "".
   */
  floorplanId?: string;

  /**
   * Optional floor ID (if known in context). Defaults to empty string "".
   */
  floorId?: string;

  /**
   * Hex color code for the area fill/border. Defaults to "#228B22".
   */
  colorArea?: string;

  /**
   * Area restriction status. Defaults to "NonRestrict".
   */
  restrictedStatus?: string;

  /**
   * Whether floor change is allowed. Defaults to false.
   */
  allowFloorChange?: boolean;

  /**
   * Assembly point flag. Defaults to false.
   */
  isAssemblyPoint?: boolean;

  /**
   * Associated label UUIDs. Defaults to [].
   */
  labelIds?: string[];
}

/**
 * Maps an internal AreaPoint to the BIONIC ProductionAreaShapePoint structure.
 * Point ID must initially be an empty string "" as required by production spec.
 */
export function toProductionShapePoint(point: AreaPoint): ProductionAreaShapePoint {
  return {
    id: '', // Backend point ID must remain empty string initially
    x: point.x,
    y: point.y,
    x_px: point.xPx,
    y_px: point.yPx,
  };
}

/**
 * Maps a BIONIC ProductionAreaShapePoint back to the internal AreaPoint structure.
 */
export function fromProductionShapePoint(point: ProductionAreaShapePoint): AreaPoint {
  return {
    id: point.id ?? '',
    x: point.x,
    y: point.y,
    xPx: point.x_px ?? point.x,
    yPx: point.y_px ?? point.y,
  };
}

/**
 * Serializes a single DetectedArea into the production BIONIC Area JSON object.
 * 
 * Complies with the BIONIC schema:
 * - areaShape: stringified array of ProductionAreaShapePoint
 * - areaNameTextBox: stringified ProductionTextBox (calculated from visual center)
 * - occupancyNameTextBox: stringified ProductionTextBox (calculated below visual center)
 * - backend ID fields default to empty strings ""
 */
export function serializeToProductionArea(
  area: DetectedArea,
  options: FloorplanSerializerOptions = {},
  fallbackIndex?: number
): ProductionAreaJson {
  // 1. Resolve area name (fallback to Area_001, Area_002, etc. if empty)
  const name =
    area.name && area.name.trim() !== ''
      ? area.name
      : formatDefaultAreaName(fallbackIndex ?? 1);

  // 2. Map internal points to production points with id: "" and x_px / y_px
  const productionPoints: ProductionAreaShapePoint[] = area.polygon.map(toProductionShapePoint);
  const areaShape = JSON.stringify(productionPoints);

  // 3. Calculate areaNameTextBox & occupancyNameTextBox from geometry (visual center)
  const { areaNameTextBox, occupancyNameTextBox } = calculateBothTextBoxes(
    area.polygon,
    options
  );

  // 4. Construct complete production JSON object with strict defaults
  return {
    floorplanId: options.floorplanId ?? PRODUCTION_DEFAULTS.floorplanId,
    floorId: options.floorId ?? PRODUCTION_DEFAULTS.floorId,
    name,
    areaShape,
    colorArea: options.colorArea ?? PRODUCTION_DEFAULTS.colorArea,
    areaNameTextBox: JSON.stringify(areaNameTextBox),
    occupancyNameTextBox: JSON.stringify(occupancyNameTextBox),
    restrictedStatus: options.restrictedStatus ?? PRODUCTION_DEFAULTS.restrictedStatus,
    allowFloorChange: options.allowFloorChange ?? PRODUCTION_DEFAULTS.allowFloorChange,
    isAssemblyPoint: options.isAssemblyPoint ?? PRODUCTION_DEFAULTS.isAssemblyPoint,
    labelIds: options.labelIds ?? [...PRODUCTION_DEFAULTS.labelIds],
  };
}

/**
 * Serializes an array of DetectedArea objects into an array of production Area JSON objects.
 */
export function serializeAreasToProductionJson(
  areas: DetectedArea[],
  options: FloorplanSerializerOptions = {}
): ProductionAreaJson[] {
  return areas.map((area, index) =>
    serializeToProductionArea(area, options, index + 1)
  );
}

/**
 * Deserializes a production Area JSON object back into internal DetectedArea model.
 * Enables round-tripping between backend/storage and detection/editing engine.
 */
export function deserializeProductionArea(prod: ProductionAreaJson, internalId?: string): DetectedArea {
  let polygon: AreaPoint[] = [];

  if (prod.areaShape && typeof prod.areaShape === 'string') {
    try {
      const parsed = JSON.parse(prod.areaShape);
      if (Array.isArray(parsed)) {
        polygon = parsed.map(fromProductionShapePoint);
      }
    } catch {
      polygon = [];
    }
  }

  return {
    id: internalId ?? '',
    name: prod.name ?? '',
    polygon,
  };
}

/**
 * Deserializes a list of production Area JSON objects.
 */
export function deserializeProductionAreas(list: ProductionAreaJson[]): DetectedArea[] {
  return list.map((item, index) =>
    deserializeProductionArea(item, `area_${index + 1}`)
  );
}
