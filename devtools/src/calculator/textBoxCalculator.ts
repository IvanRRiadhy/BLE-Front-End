import { AreaPoint } from '../types/detection.js';
import { ProductionTextBox, PRODUCTION_DEFAULTS } from '../types/production.js';
import { calculateVisualCenter, calculateBoundingBox, isPointInPolygon } from '../geometry/polygon.js';

export interface TextBoxCalculationOptions {
  areaNameFontSize?: number;
  areaNameFontColor?: string;
  occupancyFontSize?: number;
  occupancyFontColor?: string;
  /**
   * Vertical spacing between the Area Name text box and the Occupancy text box.
   * Default is roughly 50-60 pixels (matching sample output offset 215 -> 278 = 63px).
   */
  verticalSpacing?: number;
}

export interface CalculatedTextBoxes {
  areaNameTextBox: ProductionTextBox;
  occupancyNameTextBox: ProductionTextBox;
}

/**
 * Calculates the Area Name Text Box from the polygon geometry (visual center).
 * Does NOT use OCR.
 */
export function calculateAreaNameTextBox(
  polygon: AreaPoint[],
  options?: TextBoxCalculationOptions
): ProductionTextBox {
  const visualCenter = calculateVisualCenter(polygon);

  return {
    posX: Math.round(visualCenter.x),
    posY: Math.round(visualCenter.y),
    fontSize: options?.areaNameFontSize ?? PRODUCTION_DEFAULTS.areaNameTextBox.fontSize,
    fontColor: options?.areaNameFontColor ?? PRODUCTION_DEFAULTS.areaNameTextBox.fontColor,
  };
}

/**
 * Calculates the Occupancy Text Box positioned below the Area Name Text Box.
 * Does NOT use OCR.
 */
export function calculateOccupancyNameTextBox(
  polygon: AreaPoint[],
  areaNameBox: ProductionTextBox,
  options?: TextBoxCalculationOptions
): ProductionTextBox {
  const bbox = calculateBoundingBox(polygon);
  const defaultSpacing = options?.verticalSpacing ?? 55;

  let posY = areaNameBox.posY + defaultSpacing;
  let posX = areaNameBox.posX;

  // Keep position inside the polygon/bounding box whenever practical
  if (posY > bbox.maxY - 15 && bbox.height > 60) {
    // If positioning below exceeds the bottom boundary, center the pair within the room
    const halfSpacing = Math.round(defaultSpacing / 2);
    posY = Math.min(bbox.maxY - 10, areaNameBox.posY + halfSpacing);
  }

  // If posX/posY is outside the polygon, test if snapping slightly keeps it inside
  const candidate = { x: posX, y: posY };
  if (!isPointInPolygon(candidate, polygon)) {
    // Attempt fallback within the polygon below the center
    const center = calculateVisualCenter(polygon);
    if (isPointInPolygon({ x: center.x, y: center.y + 30 }, polygon)) {
      posY = Math.round(center.y + 30);
    }
  }

  return {
    posX: Math.round(posX),
    posY: Math.round(posY),
    fontSize: options?.occupancyFontSize ?? PRODUCTION_DEFAULTS.occupancyNameTextBox.fontSize,
    fontColor: options?.occupancyFontColor ?? PRODUCTION_DEFAULTS.occupancyNameTextBox.fontColor,
  };
}

/**
 * Calculates both Area Name and Occupancy text boxes for a detected polygon.
 */
export function calculateBothTextBoxes(
  polygon: AreaPoint[],
  options?: TextBoxCalculationOptions
): CalculatedTextBoxes {
  const areaNameTextBox = calculateAreaNameTextBox(polygon, options);
  const occupancyNameTextBox = calculateOccupancyNameTextBox(polygon, areaNameTextBox, options);

  return {
    areaNameTextBox,
    occupancyNameTextBox,
  };
}
