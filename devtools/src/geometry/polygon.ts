import { AreaPoint } from '../types/detection.js';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Calculate the axis-aligned bounding box of a polygon (using pixel coordinates).
 */
export function calculateBoundingBox(points: AreaPoint[] | Point2D[]): BoundingBox {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const pt of points) {
    const x = 'xPx' in pt ? pt.xPx : pt.x;
    const y = 'yPx' in pt ? pt.yPx : pt.y;

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const width = Math.max(0, maxX - minX);
  const height = Math.max(0, maxY - minY);
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;

  return { minX, minY, maxX, maxY, width, height, centerX, centerY };
}

/**
 * Standard ray-casting algorithm to test whether a 2D point is inside a polygon.
 */
export function isPointInPolygon(point: Point2D, polygon: AreaPoint[] | Point2D[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  const px = point.x;
  const py = point.y;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const p1 = polygon[i];
    const p2 = polygon[j];

    const xi = 'xPx' in p1 ? p1.xPx : p1.x;
    const yi = 'yPx' in p1 ? p1.yPx : p1.y;
    const xj = 'xPx' in p2 ? p2.xPx : p2.x;
    const yj = 'yPx' in p2 ? p2.yPx : p2.y;

    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Calculate the centroid of a polygon.
 */
export function calculateCentroid(points: AreaPoint[] | Point2D[]): Point2D {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length < 3) {
    let sumX = 0;
    let sumY = 0;
    for (const pt of points) {
      sumX += 'xPx' in pt ? pt.xPx : pt.x;
      sumY += 'yPx' in pt ? pt.yPx : pt.y;
    }
    return { x: sumX / points.length, y: sumY / points.length };
  }

  let signedArea = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < points.length; i++) {
    const nextIdx = (i + 1) % points.length;
    const p0 = points[i];
    const p1 = points[nextIdx];

    const x0 = 'xPx' in p0 ? p0.xPx : p0.x;
    const y0 = 'yPx' in p0 ? p0.yPx : p0.y;
    const x1 = 'xPx' in p1 ? p1.xPx : p1.x;
    const y1 = 'yPx' in p1 ? p1.yPx : p1.y;

    const cross = x0 * y1 - x1 * y0;
    signedArea += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }

  signedArea *= 0.5;
  if (Math.abs(signedArea) < 1e-6) {
    const bbox = calculateBoundingBox(points);
    return { x: bbox.centerX, y: bbox.centerY };
  }

  cx = cx / (6 * signedArea);
  cy = cy / (6 * signedArea);

  return { x: cx, y: cy };
}

/**
 * Calculate minimum distance from a point to a line segment.
 */
function pointToSegmentDistanceSq(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  let dx = x2 - x1;
  let dy = y2 - y1;

  if (dx !== 0 || dy !== 0) {
    const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x1 = x2;
      y1 = y2;
    } else if (t > 0) {
      x1 += dx * t;
      y1 += dy * t;
    }
  }

  dx = px - x1;
  dy = py - y1;
  return dx * dx + dy * dy;
}

/**
 * Signed distance from point to polygon perimeter (positive if inside, negative if outside).
 */
export function pointToPolygonDistance(point: Point2D, points: AreaPoint[] | Point2D[]): number {
  if (points.length === 0) return 0;

  const inside = isPointInPolygon(point, points);
  let minDistanceSq = Infinity;

  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const p1 = points[i];
    const p2 = points[j];
    const x1 = 'xPx' in p1 ? p1.xPx : p1.x;
    const y1 = 'yPx' in p1 ? p1.yPx : p1.y;
    const x2 = 'xPx' in p2 ? p2.xPx : p2.x;
    const y2 = 'yPx' in p2 ? p2.yPx : p2.y;

    const distSq = pointToSegmentDistanceSq(point.x, point.y, x1, y1, x2, y2);
    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
    }
  }

  const dist = Math.sqrt(minDistanceSq);
  return inside ? dist : -dist;
}

/**
 * Calculate the visual center (Pole of Inaccessibility).
 * 
 * Ensures the center point lies inside the polygon even for irregular,
 * concave, L-shaped, or U-shaped rooms.
 * 
 * @param points Polygon vertices in pixel coordinates.
 * @param precision Precision threshold for grid search.
 */
export function calculateVisualCenter(points: AreaPoint[] | Point2D[], precision: number = 1.0): Point2D {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length <= 2) {
    const bbox = calculateBoundingBox(points);
    return { x: bbox.centerX, y: bbox.centerY };
  }

  // 1. Calculate centroid
  const centroid = calculateCentroid(points);

  // If centroid is comfortably inside polygon (at least 15px from edge), use it for aesthetics
  const centroidDist = pointToPolygonDistance(centroid, points);
  if (centroidDist > 15) {
    return centroid;
  }

  // 2. Pole of Inaccessibility (polylabel algorithm) to guarantee point is inside
  const bbox = calculateBoundingBox(points);
  const width = bbox.width;
  const height = bbox.height;
  const cellSize = Math.min(width, height);
  if (cellSize === 0) return { x: bbox.minX, y: bbox.minY };

  let h = cellSize / 2;

  // Grid search initialized around bounding box
  let bestPoint = centroidDist > 0 ? centroid : { x: bbox.centerX, y: bbox.centerY };
  let maxDistance = centroidDist;

  // Sample grid
  for (let x = bbox.minX; x < bbox.maxX; x += cellSize) {
    for (let y = bbox.minY; y < bbox.maxY; y += cellSize) {
      const p = { x: x + h, y: y + h };
      const d = pointToPolygonDistance(p, points);
      if (d > maxDistance) {
        bestPoint = p;
        maxDistance = d;
      }
    }
  }

  // Iterative subdivision
  let step = cellSize / 2;
  while (step > precision) {
    h = step / 2;
    const searchPoints: Point2D[] = [
      { x: bestPoint.x - h, y: bestPoint.y - h },
      { x: bestPoint.x + h, y: bestPoint.y - h },
      { x: bestPoint.x - h, y: bestPoint.y + h },
      { x: bestPoint.x + h, y: bestPoint.y + h },
      { x: bestPoint.x, y: bestPoint.y - h },
      { x: bestPoint.x, y: bestPoint.y + h },
      { x: bestPoint.x - h, y: bestPoint.y },
      { x: bestPoint.x + h, y: bestPoint.y },
    ];

    for (const p of searchPoints) {
      if (p.x >= bbox.minX && p.x <= bbox.maxX && p.y >= bbox.minY && p.y <= bbox.maxY) {
        const d = pointToPolygonDistance(p, points);
        if (d > maxDistance) {
          bestPoint = p;
          maxDistance = d;
        }
      }
    }
    step /= 2;
  }

  // If even polylabel couldn't find an interior point (e.g. self-intersecting or degenerate),
  // fallback to centroid or bbox center
  return bestPoint;
}
