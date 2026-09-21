import { GroundTruthPoint } from './types.js';

/**
 * Calculates 2D polygon area using the Shoelace formula.
 */
export function calculatePolygonArea(points: GroundTruthPoint[]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const curr = points[i];
    const next = points[(i + 1) % n];
    sum += curr.xPx * next.yPx - next.xPx * curr.yPx;
  }
  return Math.abs(sum) / 2;
}

/**
 * Calculates geometric centroid of a polygon.
 */
export function calculateGroundTruthCentroid(points: GroundTruthPoint[]): GroundTruthPoint {
  if (points.length === 0) return { xPx: 0, yPx: 0 };
  if (points.length === 1) return { xPx: points[0].xPx, yPx: points[0].yPx };
  if (points.length === 2) {
    return {
      xPx: Math.round((points[0].xPx + points[1].xPx) / 2),
      yPx: Math.round((points[0].yPx + points[1].yPx) / 2),
    };
  }

  let cx = 0;
  let cy = 0;
  let signedArea = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const p0 = points[i];
    const p1 = points[(i + 1) % n];
    const cross = p0.xPx * p1.yPx - p1.xPx * p0.yPx;
    signedArea += cross;
    cx += (p0.xPx + p1.xPx) * cross;
    cy += (p0.yPx + p1.yPx) * cross;
  }

  signedArea = signedArea / 2;
  if (Math.abs(signedArea) < 1e-6) {
    const sumX = points.reduce((acc, p) => acc + p.xPx, 0);
    const sumY = points.reduce((acc, p) => acc + p.yPx, 0);
    return { xPx: Math.round(sumX / n), yPx: Math.round(sumY / n) };
  }

  return {
    xPx: Math.round(cx / (6 * signedArea)),
    yPx: Math.round(cy / (6 * signedArea)),
  };
}

/**
 * Checks if two line segments intersect strictly.
 */
export function doSegmentsIntersect(
  p1: GroundTruthPoint,
  p2: GroundTruthPoint,
  p3: GroundTruthPoint,
  p4: GroundTruthPoint,
  excludeEndpoints = true
): boolean {
  function ccw(a: GroundTruthPoint, b: GroundTruthPoint, c: GroundTruthPoint): number {
    return (c.yPx - a.yPx) * (b.xPx - a.xPx) - (b.yPx - a.yPx) * (c.xPx - a.xPx);
  }

  const ccw1 = ccw(p1, p3, p4);
  const ccw2 = ccw(p2, p3, p4);
  const ccw3 = ccw(p1, p2, p3);
  const ccw4 = ccw(p1, p2, p4);

  if (excludeEndpoints) {
    return (
      ((ccw1 > 1e-6 && ccw2 < -1e-6) || (ccw1 < -1e-6 && ccw2 > 1e-6)) &&
      ((ccw3 > 1e-6 && ccw4 < -1e-6) || (ccw3 < -1e-6 && ccw4 > 1e-6))
    );
  }

  return (
    ((ccw1 >= 0 && ccw2 <= 0) || (ccw1 <= 0 && ccw2 >= 0)) &&
    ((ccw3 >= 0 && ccw4 <= 0) || (ccw3 <= 0 && ccw4 >= 0))
  );
}

/**
 * Tests whether a polygon self-intersects.
 */
export function hasSelfIntersection(points: GroundTruthPoint[]): boolean {
  const n = points.length;
  if (n < 4) return false;

  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];

    for (let j = i + 1; j < n; j++) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) {
        continue;
      }

      const p3 = points[j];
      const p4 = points[(j + 1) % n];

      if (doSegmentsIntersect(p1, p2, p3, p4, true)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Calculates distance from point to line segment (a - b) and finds the closest point.
 */
export function pointToSegmentDistance(
  p: GroundTruthPoint,
  a: GroundTruthPoint,
  b: GroundTruthPoint
): { distance: number; closestPoint: GroundTruthPoint; t: number } {
  const dx = b.xPx - a.xPx;
  const dy = b.yPx - a.yPx;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    const dist = Math.hypot(p.xPx - a.xPx, p.yPx - a.yPx);
    return { distance: dist, closestPoint: { xPx: a.xPx, yPx: a.yPx }, t: 0 };
  }

  let t = ((p.xPx - a.xPx) * dx + (p.yPx - a.yPx) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = a.xPx + t * dx;
  const projY = a.yPx + t * dy;
  const distance = Math.hypot(p.xPx - projX, p.yPx - projY);

  return {
    distance,
    closestPoint: { xPx: Math.round(projX), yPx: Math.round(projY) },
    t,
  };
}

/**
 * Merges two polygons via 2D convex hull.
 */
export function mergeTwoPolygons(
  polyA: GroundTruthPoint[],
  polyB: GroundTruthPoint[]
): GroundTruthPoint[] {
  const allPoints = [...polyA, ...polyB];
  if (allPoints.length <= 3) return allPoints;

  const sorted = [...allPoints].sort((a, b) => (a.xPx === b.xPx ? a.yPx - b.yPx : a.xPx - b.xPx));

  function crossProduct(o: GroundTruthPoint, a: GroundTruthPoint, b: GroundTruthPoint): number {
    return (a.xPx - o.xPx) * (b.yPx - o.yPx) - (a.yPx - o.yPx) * (b.xPx - o.xPx);
  }

  const lower: GroundTruthPoint[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: GroundTruthPoint[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}
