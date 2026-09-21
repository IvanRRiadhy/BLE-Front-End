import { DetectedArea, AreaPoint } from '../types/detection.js';
import { ProductionAreaJson } from '../types/production.js';
import {
  serializeAreasToProductionJson,
  FloorplanSerializerOptions,
} from '../serializer/floorplanSerializer.js';
import { assignDefaultAreaNames } from '../naming/areaNaming.js';
import { CoordinateTransformer } from '../transforms/coordinateTransform.js';

/**
 * Contract for any Floorplan Detection Engine implementation.
 * Independent of the production JSON serialization.
 */
export interface IFloorplanDetectionEngine {
  /**
   * Process an image source (Canvas, ImageData, Buffer, or URL) and return raw detected areas.
   */
  detectAreas(imageInput: unknown): Promise<DetectedArea[]> | DetectedArea[];
}

export interface PipelineOptions extends FloorplanSerializerOptions {
  coordinateTransformer?: CoordinateTransformer;
  autoAssignDefaultNames?: boolean;
}

/**
 * Normalizes detected polygon geometry:
 * - Removes consecutive duplicate vertices
 * - Removes degenerate zero-area edges
 */
export function normalizePolygonGeometry(points: AreaPoint[]): AreaPoint[] {
  if (points.length < 3) return points;

  const cleaned: AreaPoint[] = [];

  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    const prev = cleaned[cleaned.length - 1];

    if (!prev || prev.xPx !== curr.xPx || prev.yPx !== curr.yPx) {
      cleaned.push(curr);
    }
  }

  // Check if first and last are identical duplicates
  if (
    cleaned.length > 2 &&
    cleaned[0].xPx === cleaned[cleaned.length - 1].xPx &&
    cleaned[0].yPx === cleaned[cleaned.length - 1].yPx
  ) {
    cleaned.pop();
  }

  return cleaned;
}

/**
 * Full architectural pipeline separating detection from production serialization.
 * 
 * Flow:
 * Floorplan Image
 *        ↓
 * Detection Engine
 *        ↓
 * DetectedArea[]
 *        ↓
 * Geometry Normalization
 *        ↓
 * TextBox Calculation
 *        ↓
 * Production JSON Serializer
 *        ↓
 * Final Area JSON
 */
export class FloorplanDetectionPipeline {
  constructor(
    private readonly detectionEngine?: IFloorplanDetectionEngine,
    private readonly defaultOptions: PipelineOptions = {}
  ) {}

  /**
   * Processes pre-detected areas through normalization, text box calculation, and serialization.
   */
  public processDetectedAreas(
    areas: DetectedArea[],
    options: PipelineOptions = {}
  ): ProductionAreaJson[] {
    const mergedOptions = { ...this.defaultOptions, ...options };

    // 1. Geometry normalization
    const normalizedAreas: DetectedArea[] = areas.map((area) => ({
      ...area,
      polygon: normalizePolygonGeometry(area.polygon),
    }));

    // 2. Auto-naming if needed
    const namedAreas =
      mergedOptions.autoAssignDefaultNames !== false
        ? assignDefaultAreaNames(normalizedAreas)
        : normalizedAreas;

    // 3. TextBox calculation & Production Serialization
    return serializeAreasToProductionJson(namedAreas, mergedOptions);
  }

  /**
   * Runs the complete pipeline from raw image input to final BIONIC Area JSON objects.
   */
  public async run(
    imageInput: unknown,
    options: PipelineOptions = {}
  ): Promise<ProductionAreaJson[]> {
    if (!this.detectionEngine) {
      throw new Error(
        'Cannot run pipeline without a configured IFloorplanDetectionEngine.'
      );
    }

    // Step 1: Detection Engine execution
    const rawAreas = await this.detectionEngine.detectAreas(imageInput);

    // Step 2-5: Normalization, TextBox calculation, and Serialization
    return this.processDetectedAreas(rawAreas, options);
  }
}
