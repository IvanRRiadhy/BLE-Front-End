import { GroundTruthArea, GroundTruthValidationError } from './types.js';
import { calculatePolygonArea, hasSelfIntersection } from './geometry.js';

/**
 * Validates a single ground truth area.
 */
export function validateGroundTruthArea(
  area: GroundTruthArea,
  imageWidth: number,
  imageHeight: number
): GroundTruthValidationError | null {
  const pts = area.polygon;

  if (!pts || pts.length < 3) {
    return {
      areaId: area.id,
      message: `${area.id.toUpperCase()} is invalid: polygon has only ${pts?.length || 0} vertices (minimum 3 required).`,
    };
  }

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (!Number.isFinite(p.xPx) || !Number.isFinite(p.yPx)) {
      return {
        areaId: area.id,
        message: `${area.id.toUpperCase()} is invalid: vertex ${i} contains non-finite coordinates.`,
      };
    }
  }

  for (let i = 0; i < pts.length; i++) {
    const nextIdx = (i + 1) % pts.length;
    const curr = pts[i];
    const next = pts[nextIdx];
    if (Math.abs(curr.xPx - next.xPx) < 0.001 && Math.abs(curr.yPx - next.yPx) < 0.001) {
      return {
        areaId: area.id,
        message: `${area.id.toUpperCase()} is invalid: contains duplicate consecutive vertices at index ${i}.`,
      };
    }
  }

  // 4. Check for self-intersection
  if (hasSelfIntersection(pts)) {
    return {
      areaId: area.id,
      message: `${area.id.toUpperCase()} is invalid: polygon self-intersects.`,
    };
  }

  // 5. Check for non-zero area
  const areaSqPx = calculatePolygonArea(pts);
  if (areaSqPx < 1.0) {
    return {
      areaId: area.id,
      message: `${area.id.toUpperCase()} is invalid: polygon area is zero or degenerate.`,
    };
  }

  if (imageWidth > 0 && imageHeight > 0) {
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (p.xPx < -1 || p.xPx > imageWidth + 1 || p.yPx < -1 || p.yPx > imageHeight + 1) {
        return {
          areaId: area.id,
          message: `${area.id.toUpperCase()} is invalid: vertex (${Math.round(p.xPx)}, ${Math.round(p.yPx)}) is outside image bounds (${imageWidth} × ${imageHeight}).`,
        };
      }
    }
  }

  return null;
}

/**
 * Validates a list of areas.
 */
export function validateAllGroundTruthAreas(
  areas: GroundTruthArea[],
  imageWidth: number,
  imageHeight: number
): { isValid: boolean; errors: GroundTruthValidationError[] } {
  const errors: GroundTruthValidationError[] = [];
  for (const area of areas) {
    const err = validateGroundTruthArea(area, imageWidth, imageHeight);
    if (err) errors.push(err);
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
}
