import { AreaPoint } from '../types/detection.js';

export interface CoordinateTransformerConfig {
  /**
   * Horizontal scale multiplier: world_x = (pixel_x - originPxX) * scaleX + originWorldX
   * Default is 1.0 (1 world unit per pixel).
   */
  scaleX?: number;

  /**
   * Vertical scale multiplier: world_y = (pixel_y - originPxY) * scaleY + originWorldY
   * Default is 1.0.
   */
  scaleY?: number;

  /**
   * Origin X in image pixel space. Default is 0.
   */
  originPxX?: number;

  /**
   * Origin Y in image pixel space. Default is 0.
   */
  originPxY?: number;

  /**
   * World coordinate at origin point X. Default is 0.
   */
  originWorldX?: number;

  /**
   * World coordinate at origin point Y. Default is 0.
   */
  originWorldY?: number;
}

export interface ICoordinateTransformer {
  pxToWorld(xPx: number, yPx: number): { x: number; y: number };
  worldToPx(x: number, y: number): { xPx: number; yPx: number };
  createAreaPoint(xPx: number, yPx: number, id?: string): AreaPoint;
  createPolygonPoints(pixelCoords: Array<{ xPx: number; yPx: number } | [number, number]>): AreaPoint[];
}

/**
 * Dedicated coordinate transformation utility isolated from detection algorithms.
 * Handles bidirectional mapping between floorplan pixel space and world/floorplan coordinates.
 */
export class CoordinateTransformer implements ICoordinateTransformer {
  private readonly scaleX: number;
  private readonly scaleY: number;
  private readonly originPxX: number;
  private readonly originPxY: number;
  private readonly originWorldX: number;
  private readonly originWorldY: number;

  constructor(config: CoordinateTransformerConfig = {}) {
    this.scaleX = config.scaleX ?? 1.0;
    this.scaleY = config.scaleY ?? 1.0;
    this.originPxX = config.originPxX ?? 0;
    this.originPxY = config.originPxY ?? 0;
    this.originWorldX = config.originWorldX ?? 0;
    this.originWorldY = config.originWorldY ?? 0;
  }

  /**
   * Convert pixel coordinates to world coordinates.
   */
  public pxToWorld(xPx: number, yPx: number): { x: number; y: number } {
    const x = (xPx - this.originPxX) * this.scaleX + this.originWorldX;
    const y = (yPx - this.originPxY) * this.scaleY + this.originWorldY;
    return {
      x: Number(x.toFixed(4)),
      y: Number(y.toFixed(4)),
    };
  }

  /**
   * Convert world coordinates back to pixel coordinates.
   */
  public worldToPx(x: number, y: number): { xPx: number; yPx: number } {
    const xPx = this.scaleX !== 0 ? (x - this.originWorldX) / this.scaleX + this.originPxX : 0;
    const yPx = this.scaleY !== 0 ? (y - this.originWorldY) / this.scaleY + this.originPxY : 0;
    return {
      xPx: Math.round(xPx),
      yPx: Math.round(yPx),
    };
  }

  /**
   * Create an AreaPoint with both pixel and world coordinates.
   * Point ID is initialized to empty string "" as required by production spec.
   */
  public createAreaPoint(xPx: number, yPx: number, id: string = ''): AreaPoint {
    const world = this.pxToWorld(xPx, yPx);
    return {
      id,
      x: world.x,
      y: world.y,
      xPx: Math.round(xPx),
      yPx: Math.round(yPx),
    };
  }

  /**
   * Convert a list of pixel coordinates into full AreaPoint models.
   */
  public createPolygonPoints(
    pixelCoords: Array<{ xPx: number; yPx: number } | [number, number]>
  ): AreaPoint[] {
    return pixelCoords.map((coord) => {
      if (Array.isArray(coord)) {
        return this.createAreaPoint(coord[0], coord[1]);
      }
      return this.createAreaPoint(coord.xPx, coord.yPx);
    });
  }

  /**
   * Calibration helper: Create a transformer from known reference image size and real world meters.
   */
  public static fromDimensions(
    imageWidthPx: number,
    imageHeightPx: number,
    worldWidth: number,
    worldHeight: number
  ): CoordinateTransformer {
    const scaleX = imageWidthPx > 0 ? worldWidth / imageWidthPx : 1.0;
    const scaleY = imageHeightPx > 0 ? worldHeight / imageHeightPx : 1.0;
    return new CoordinateTransformer({ scaleX, scaleY });
  }

  /**
   * Default 1:1 identity transformer (pixel = world).
   */
  public static defaultTransformer(): CoordinateTransformer {
    return new CoordinateTransformer();
  }
}
